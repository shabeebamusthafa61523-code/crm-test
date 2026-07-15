/**
 * src/config/socket.js
 * Socket.IO server configuration and accessor.
 * The io instance is attached here during server initialization in server.js.
 */

let _io = null;

/**
 * Attach the socket.io instance (call this from server.js after http.createServer)
 */
export const initSocketIO = (io) => {
  _io = io;
};

/**
 * Get the current socket.io instance.
 * Throws a warning (not a crash) if not yet initialized.
 */
export const getSocketIO = () => {
  if (!_io) {
    throw new Error('Socket.IO has not been initialized yet.');
  }
  return _io;
};

export default { initSocketIO, getSocketIO };
