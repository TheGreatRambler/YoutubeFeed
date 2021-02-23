#include <algorithm>
#include <bsoncxx/builder/stream/array.hpp>
#include <bsoncxx/builder/stream/document.hpp>
#include <bsoncxx/builder/stream/helpers.hpp>
#include <bsoncxx/json.hpp>
#include <chrono>
#include <cstdio>
#include <mongocxx/client.hpp>
#include <mongocxx/instance.hpp>
#include <mongocxx/stdx.hpp>
#include <mongocxx/uri.hpp>
#include <set>
#include <string_view>
#include <vector>
#include <websocketpp/config/asio_no_tls.hpp>
#include <websocketpp/server.hpp>

typedef websocketpp::server<websocketpp::config::asio> server;

using bsoncxx::builder::basic::kvp;
using bsoncxx::builder::basic::make_array;
using bsoncxx::builder::basic::make_document;
using websocketpp::connection_hdl;
using websocketpp::lib::bind;

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

			mongocxx::collection user_interactions = youtubefeed_database["interactions_" + user_id];

			// Check if indices is empty
			if (user_interactions.list_indexes ().begin () == user_interactions.list_indexes ().end ()) {
				// Add week long expire time
				// https://docs.mongodb.com/manual/tutorial/expire-data/
				using days                      = std::chrono::duration<int, std::ratio_multiply<std::ratio<24>, std::chrono::hours::period>>;
				bsoncxx::document::value index  = bsoncxx::builder::stream::document {} << "createdAt" << 1 << bsoncxx::builder::stream::finalize;
				bsoncxx::document::value expire = bsoncxx::builder::stream::document {} << "expireAfterSeconds" << std::chrono::duration_cast<std::chrono::seconds> (days (7)).count () << bsoncxx::builder::stream::finalize;

				user_interactions.create_index (bsoncxx::document::view_or_value (index), bsoncxx::document::view_or_value (expire), mongocxx::options::index_view {});
			}

			auto result = user_interactions.insert_one (incoming_interaction.view ());
		} else if (string_flag == "request_entries") {
			int64_t older_than = docview["olderThan"].get_int64 ().value;
			int64_t quantity   = docview["quantity"].get_int64 ().value;

			std::string user_id               = get_string_from_bson (docview["userId"]);
			mongocxx::collection user_friends = youtubefeed_database["friends_" + user_id];

			std::vector<bsoncxx::document::view> results;

			auto friends_cursor = user_friends.find ({});
			for (auto&& f : friends_cursor) {
				std::string friend_id = get_string_from_bson (f["userId"]);

				// TODO consider putting all interactions in the same collection
				mongocxx::options::find opts;
				// Sort descending
				opts.sort (make_document (kvp ("dateAdded", -1)));
				// Limit results
				opts.limit (quantity);
				// Find elements older than the supplied date
				auto cursor = youtubefeed_database["interactions_" + friend_id].find (
					make_document (kvp ("dateAdded", make_document (kvp ("$lt", older_than)))), opts);

				for (auto& interaction : cursor) {
					results.push_back (interaction);
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
					i++;
				}
			}

			server::connection_ptr con = m_server.get_con_from_hdl (hdl);
			msg->set_payload ("{'results':" + result + "}");
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
		}
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

	puts ("Starting websocket server");
	feedServer.run (9002);
}