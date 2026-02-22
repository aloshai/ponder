import http from "node:http";
export const getNextAvailablePort = async ({ common }) => {
    const server = http.createServer();
    let port = common.options.port;
    return new Promise((resolve, reject) => {
        server.once("error", (error) => {
            if (error.code === "EADDRINUSE") {
                common.logger.warn({
                    msg: "Port in use",
                    port,
                });
                port += 1;
                setTimeout(() => {
                    server.listen(port, common.options.hostname);
                }, 5);
            }
            else {
                reject(error);
            }
        });
        server.once("listening", () => {
            // Port is available
            resolve(port);
        });
        server.listen(port, common.options.hostname);
    }).finally(() => {
        server.close();
    });
};
//# sourceMappingURL=port.js.map