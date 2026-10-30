let ioRef = null;

function setIO(io) {
  ioRef = io;
}

function emitToUser(userId, event, payload) {
  if (!ioRef || !userId) return;
  ioRef.to(`user:${String(userId)}`).emit(event, payload);
}

function emitToRole(role, event, payload) {
  if (!ioRef) return;
  ioRef.to(`role:${role}`).emit(event, payload);
}

function getIO() {
  return ioRef;
}

module.exports = { setIO, emitToUser, emitToRole, getIO };
