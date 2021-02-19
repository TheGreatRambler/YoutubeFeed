#include <rapidjson/document.h>
#include <rapidjson/stringbuffer.h>
#include <set>
#include <websocketpp/config/asio_no_tls.hpp>
#include <websocketpp/server.hpp>

typedef websocketpp::server<websocketpp::config::asio> server;

using websocketpp::connection_hdl;
using websocketpp::lib::bind;

class websocket_server {
public:
	websocket_server () {
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
		for (auto it : m_connections) {
			m_server.send (it, msg);
		}
	}

	void record_channel_interaction (std::string channel_id, std::string ineraction_type, uint64_t date) {
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
};

int main () {
	websocket_server feedServer;
	feedServer.run (9002);
}