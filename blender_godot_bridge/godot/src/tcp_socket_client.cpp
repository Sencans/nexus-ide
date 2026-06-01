#include "tcp_socket_client.h"
#include <iostream>
#include <cstdint>

#ifndef _WIN32
    #include <sys/socket.h>
    #include <arpa/inet.h>
    #include <unistd.h>
    #define INVALID_SOCKET -1
    #define SOCKET_ERROR -1
#endif

TcpSocketClient::TcpSocketClient() : sock_fd(INVALID_SOCKET), connected(false) {
#ifdef _WIN32
    WSADATA wsa;
    WSAStartup(MAKEWORD(2, 2), &wsa);
#endif
}

TcpSocketClient::~TcpSocketClient() {
    disconnect();
#ifdef _WIN32
    WSACleanup();
#endif
}

bool TcpSocketClient::connect_to(const std::string& host, int port) {
    disconnect();

    sock_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (sock_fd == INVALID_SOCKET) {
        return false;
    }

    sockaddr_in server_addr{};
    server_addr.sin_family = AF_INET;
    server_addr.sin_port = htons(port);
    inet_pton(AF_INET, host.c_str(), &server_addr.sin_addr);

    if (connect(sock_fd, (struct sockaddr*)&server_addr, sizeof(server_addr)) == SOCKET_ERROR) {
        disconnect();
        return false;
    }

    connected = true;
    return true;
}

void TcpSocketClient::disconnect() {
    if (sock_fd != INVALID_SOCKET) {
#ifdef _WIN32
        closesocket(sock_fd);
#else
        close(sock_fd);
#endif
        sock_fd = INVALID_SOCKET;
    }
    connected = false;
}

bool TcpSocketClient::send_data(const std::string& data) {
    if (!connected) return false;

    // Enviar primero la cabecera del tamaño (4 bytes, big endian)
    uint32_t len = htonl(static_cast<uint32_t>(data.size()));
    if (send(sock_fd, reinterpret_cast<const char*>(&len), 4, 0) == SOCKET_ERROR) {
        disconnect();
        return false;
    }

    // Enviar el cuerpo del JSON
    if (send(sock_fd, data.c_str(), data.size(), 0) == SOCKET_ERROR) {
        disconnect();
        return false;
    }
    return true;
}

bool TcpSocketClient::receive_data(std::string& out_data) {
    if (!connected) return false;

    // Recibir cabecera de tamaño (4 bytes)
    uint32_t len = 0;
    int received = recv(sock_fd, reinterpret_cast<char*>(&len), 4, 0);
    if (received <= 0) {
        disconnect();
        return false;
    }
    len = ntohl(len);

    // Recibir cuerpo
    out_data.resize(len);
    uint32_t total_received = 0;
    while (total_received < len) {
        int bytes = recv(sock_fd, &out_data[total_received], len - total_received, 0);
        if (bytes <= 0) {
            disconnect();
            return false;
        }
        total_received += bytes;
    }
    return true;
}
