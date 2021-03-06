#include <algorithm>
#include <bsoncxx/builder/stream/array.hpp>
#include <bsoncxx/builder/stream/document.hpp>
#include <bsoncxx/builder/stream/helpers.hpp>
#include <bsoncxx/json.hpp>
#include <chrono>
#include <cstdio>
#include <fmt/core.h>
#include <fmt/format.h>
#include <mongocxx/client.hpp>
#include <mongocxx/instance.hpp>
#include <mongocxx/stdx.hpp>
#include <mongocxx/uri.hpp>
#include <set>
#include <string_view>
#include <vector>
#include <websocketpp/config/asio.hpp>
#include <websocketpp/server.hpp>

typedef websocketpp::server<websocketpp::config::asio_tls> server;
typedef websocketpp::lib::shared_ptr<websocketpp::lib::asio::ssl::context> context_ptr;

using bsoncxx::builder::basic::kvp;
using bsoncxx::builder::basic::make_array;
using bsoncxx::builder::basic::make_document;
using websocketpp::connection_hdl;
using websocketpp::lib::bind;

enum tls_mode {
	MOZILLA_INTERMEDIATE = 1,
	MOZILLA_MODERN       = 2
};

class websocket_server {
public:
	websocket_server () {
		mongodb_client = mongocxx::client (mongocxx::uri ("mongodb://localhost:27017"));

		if (mongodb_client) {
			puts ("Client was constructed");
		} else {
			puts ("Client was not constructed");
		}

		youtubefeed_database = mongodb_client["youtubefeed"];

		m_server.init_asio ();

		m_server.set_access_channels (websocketpp::log::alevel::all);
		m_server.set_error_channels (websocketpp::log::elevel::all);

		m_server.set_open_handler (bind (&websocket_server::on_open, this, websocketpp::lib::placeholders::_1));
		m_server.set_close_handler (bind (&websocket_server::on_close, this, websocketpp::lib::placeholders::_1));
		m_server.set_message_handler (bind (&websocket_server::on_message, this, websocketpp::lib::placeholders::_1, websocketpp::lib::placeholders::_2));
		m_server.set_tls_init_handler (bind (&websocket_server::on_tls_init, this, MOZILLA_MODERN, websocketpp::lib::placeholders::_1));
	}

	void on_open (connection_hdl hdl) {
		m_connections.insert (hdl);
	}

	void on_close (connection_hdl hdl) {
		m_connections.erase (hdl);
	}

	void on_message (connection_hdl hdl, server::message_ptr msg) {
		puts (("Message: " + msg->get_payload ()).c_str ());

		bsoncxx::document::value doc    = bsoncxx::from_json (bsoncxx::stdx::string_view (msg->get_payload ()));
		bsoncxx::document::view docview = doc.view ();

		bsoncxx::document::element flag = docview["flag"];
		std::string string_flag         = get_string_from_bson (flag);

		if (string_flag == "new_interaction") {
			std::string user_id               = get_string_from_bson (docview["userId"]);
			auto incoming_interaction_builder = bsoncxx::builder::stream::document {};
			// clang-format off
			bsoncxx::document::value incoming_interaction = incoming_interaction_builder
				<< "userId" << user_id
				<< "user" << get_string_from_bson(docview["user"])
				<< "id" << get_string_from_bson(docview["id"])
				<< "title" << get_string_from_bson(docview["title"])
				<< "length" << get_string_from_bson(docview["length"])
				<< "creator" << get_string_from_bson(docview["creator"])
				<< "creatorId" << get_string_from_bson(docview["creatorId"])
				<< "verified" << docview["verified"].get_bool().value
				<< "dateAdded" << docview["dateAdded"].get_int64().value
				<< "action" << get_string_from_bson(docview["action"])
				<< bsoncxx::builder::stream::finalize;
			// clang-format on

			puts (fmt::format ("Add interaction {} from user {}", get_string_from_bson (docview["action"]), user_id).c_str ());

			mongocxx::collection user_interactions = youtubefeed_database["interactions_" + user_id];

			// Check if indices is empty
			if (user_interactions.list_indexes ().begin () == user_interactions.list_indexes ().end ()) {
				// Add week long expire time
				// https://docs.mongodb.com/manual/tutorial/expire-data/
				puts (fmt::format ("Creating indice for interactions_{}\n", user_id).c_str ());

				using days                      = std::chrono::duration<int, std::ratio_multiply<std::ratio<24>, std::chrono::hours::period>>;
				bsoncxx::document::value index  = bsoncxx::builder::stream::document {} << "createdAt" << 1 << bsoncxx::builder::stream::finalize;
				bsoncxx::document::value expire = bsoncxx::builder::stream::document {} << "expireAfterSeconds" << std::chrono::duration_cast<std::chrono::seconds> (days (7)).count () << bsoncxx::builder::stream::finalize;

				user_interactions.create_index (bsoncxx::document::view_or_value (index), bsoncxx::document::view_or_value (expire), mongocxx::options::index_view {});
			}

			auto result = user_interactions.insert_one (incoming_interaction.view ());

			puts (fmt::format ("{} documents were added\n", result.value ().result ().inserted_count ()).c_str ());

			std::vector<bsoncxx::document::view> results;

			auto all_interactions = user_interactions.find ({});
			for (auto&& d : all_interactions) {
				puts (fmt::format ("{}\n", bsoncxx::to_json (d)).c_str ());
			}
		} else if (string_flag == "request_entries") {
			int64_t older_than = docview["olderThan"].get_int64 ().value;
			int64_t quantity   = (int64_t)docview["quantity"].get_int32 ().value;

			std::string user_id               = get_string_from_bson (docview["userId"]);
			mongocxx::collection user_friends = youtubefeed_database["friends_" + user_id];

			std::vector<bsoncxx::document::value> results;

			auto friends_cursor = user_friends.find ({});
			for (auto&& f : friends_cursor) {
				std::string friend_id       = get_string_from_bson (f["userId"]);
				std::string collection_name = "interactions_" + friend_id;

				// TODO consider putting all interactions in the same collection
				mongocxx::options::find opts;
				// Sort descending
				opts.sort (make_document (kvp ("dateAdded", -1)));
				// Limit results
				opts.limit (quantity);

				if (youtubefeed_database.has_collection (collection_name)) {
					// Find elements older than the supplied date
					auto cursor = youtubefeed_database[collection_name].find (
						make_document (kvp ("dateAdded", make_document (kvp ("$lt", older_than)))), opts);

					for (auto& interaction : cursor) {
						// So that the results in the vector are owning
						results.push_back (bsoncxx::document::value (interaction));
					}
				}
			}

			std::sort (results.begin (), results.end (), [] (bsoncxx::document::view i, bsoncxx::document::view j) -> bool {
				return i["dateAdded"].get_int64 ().value > j["dateAdded"].get_int64 ().value;
			});

			std::string result = "[";
			int64_t i          = 0;
			int64_t end        = std::min ((int64_t)results.size (), quantity);
			while (true) {
				if (i == end) {
					result += "]";
					break;
				} else if (i == (end - 1)) {
					result += bsoncxx::to_json (results[i]);
				} else {
					result += bsoncxx::to_json (results[i]) + ",";
				}
				i++;
			}

			puts (fmt::format ("Recommendations results: {}\n", result).c_str ());

			server::connection_ptr con = m_server.get_con_from_hdl (hdl);
			msg->set_payload ("{\"results\":" + result + ",\"flag\":\"recieve_entries\"}");
			msg->set_opcode (websocketpp::frame::opcode::text);
			msg->set_compressed (true);
			con->send (msg);
		} else if (string_flag == "add_friend") {
			std::string user_id   = get_string_from_bson (docview["userId"]);
			std::string friend_id = get_string_from_bson (docview["friendUserId"]);

			auto add_friend_builder = bsoncxx::builder::stream::document {};
			// clang-format off
			bsoncxx::document::value add_friend = add_friend_builder
				<< "userId" << friend_id
				<< bsoncxx::builder::stream::finalize;
			// clang-format on

			mongocxx::collection user_friends = youtubefeed_database["friends_" + user_id];
			auto result                       = user_friends.insert_one (add_friend.view ());
		} else if (string_flag == "remove_friend") {
			std::string user_id   = get_string_from_bson (docview["userId"]);
			std::string friend_id = get_string_from_bson (docview["friendUserId"]);

			auto remove_friend_builder = bsoncxx::builder::stream::document {};
			// clang-format off
			bsoncxx::document::value remove_friend = remove_friend_builder
				<< "userId" << friend_id
				<< bsoncxx::builder::stream::finalize;
			// clang-format on

			mongocxx::collection user_friends = youtubefeed_database["friends_" + user_id];
			auto result                       = user_friends.delete_one (remove_friend.view ());
		} else if (string_flag == "send_subscriptions") {
			std::string user_id               = get_string_from_bson (docview["userId"]);
			mongocxx::collection user_friends = youtubefeed_database["friends_" + user_id];

			// Delete all existing records
			user_friends.delete_many ({});

			// Add subscriptions
			std::vector<bsoncxx::document::value> subs;

			for (auto&& sub : docview["data"].get_array ().value) {
				subs.push_back (
					bsoncxx::builder::stream::document {} << "userId" << get_string_from_bson (sub["id"]) << bsoncxx::builder::stream::finalize);
			}

			user_friends.insert_many (subs);
		}
	}

	context_ptr on_tls_init (tls_mode mode, websocketpp::connection_hdl hdl) {
		namespace asio = websocketpp::lib::asio;

		puts (fmt::format ("on_tls_init called with hdl: {}\n", hdl.lock ().get ()).c_str ());
		puts (fmt::format ("Using TLS mode: {}\n", (mode == MOZILLA_MODERN ? "Mozilla Modern" : "Mozilla Intermediate")).c_str ());

		context_ptr ctx = websocketpp::lib::make_shared<asio::ssl::context> (asio::ssl::context::sslv23);

		try {
			if (mode == MOZILLA_MODERN) {
				// Modern disables TLSv1
				ctx->set_options (asio::ssl::context::default_workarounds | asio::ssl::context::no_sslv2 | asio::ssl::context::no_sslv3 | asio::ssl::context::no_tlsv1 | asio::ssl::context::single_dh_use);
			} else {
				ctx->set_options (asio::ssl::context::default_workarounds | asio::ssl::context::no_sslv2 | asio::ssl::context::no_sslv3 | asio::ssl::context::single_dh_use);
			}
			//ctx->set_password_callback (bind (&websocket_server::get_password, this));
			ctx->use_certificate_chain_file ("server.pem");
			ctx->use_private_key_file ("server.key", asio::ssl::context::pem);

			// Example method of generating this file:
			// `openssl dhparam -out dh.pem 2048`
			// Mozilla Intermediate suggests 1024 as the minimum size to use
			// Mozilla Modern suggests 2048 as the minimum size to use.
			ctx->use_tmp_dh_file ("dh.pem");

			std::string ciphers;

			if (mode == MOZILLA_MODERN) {
				ciphers = "ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-DSS-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-DSS-AES128-SHA256:DHE-RSA-AES256-SHA256:DHE-DSS-AES256-SHA:DHE-RSA-AES256-SHA:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!3DES:!MD5:!PSK";
			} else {
				ciphers = "ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-DSS-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-DSS-AES128-SHA256:DHE-RSA-AES256-SHA256:DHE-DSS-AES256-SHA:DHE-RSA-AES256-SHA:AES128-GCM-SHA256:AES256-GCM-SHA384:AES128-SHA256:AES256-SHA256:AES128-SHA:AES256-SHA:AES:CAMELLIA:DES-CBC3-SHA:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!aECDH:!EDH-DSS-DES-CBC3-SHA:!EDH-RSA-DES-CBC3-SHA:!KRB5-DES-CBC3-SHA";
			}

			if (SSL_CTX_set_cipher_list (ctx->native_handle (), ciphers.c_str ()) != 1) {
				puts ("Error setting cipher list\n");
			}
		} catch (std::exception& e) {
			puts (fmt::format ("Websocket encryption exception: {}\n", e.what ()).c_str ());
		}
		return ctx;
	}

	std::string get_password () {
		return "test";
	}

	static std::string get_string_from_bson (bsoncxx::document::element element) {
		return element.get_utf8 ().value.to_string ();
	}

	void run (uint16_t port) {
		m_server.listen (port);
		m_server.start_accept ();
		m_server.run ();
	}

private:
	typedef std::set<connection_hdl, std::owner_less<connection_hdl>> con_list;

	server m_server;
	con_list m_connections;

	mongocxx::instance mongodb_instance {};
	mongocxx::client mongodb_client;
	mongocxx::database youtubefeed_database;
};

int main () {
	websocket_server feedServer;

	puts ("Starting websocket server\n");
	feedServer.run (9002);
}