#ifndef TCP_SOCKET_CLIENT_H
#define TCP_SOCKET_CLIENT_H

#include <string>

#ifdef _WIN32
    #include <winsock2.h>
    #include <ws2tcpip.h>
    typedef SOCKET socket_t;
#else
    typedef int socket_t;
#endif

class TcpSocketClient {
private:
    socket_t sock_fd;
    bool connected;

public:
    TcpSocketClient();
    ~TcpSocketClient();

    bool connect_to(const std::string& host, int port);
    void disconnect();
    bool send_data(const std::string& data);
    bool receive_data(std::string& out_data);
    bool is_connected() const { return connected; }
};

#endif // TCP_SOCKET_CLIENT_H
