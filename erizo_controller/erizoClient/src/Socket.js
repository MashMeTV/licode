/* global */

import io from '../lib/socket.io';
import Logger from './utils/Logger';

import { EventDispatcher, LicodeEvent } from './Events';

const SocketEvent = (type, specInput) => {
  const that = LicodeEvent({ type });
  that.args = specInput.args;
  return that;
};

/*
 * Class Stream represents a local or a remote Stream in the Room. It will handle the WebRTC
 * stream and identify the stream and where it should be drawn.
 */
const Socket = (newIo) => {
  const that = EventDispatcher();
  const defaultCallback = () => {};
  const messageBuffer = [];

  that.CONNECTED = Symbol('connected');
  that.RECONNECTING = Symbol('reconnecting');
  that.DISCONNECTED = Symbol('disconnected');

  const WEBSOCKET_NORMAL_CLOSURE = 1000;
  that.state = that.DISCONNECTED;
  that.IO = newIo === undefined ? io : newIo;

  let socket;

  const emit = (type, ...args) => {
    that.emit(SocketEvent(type, { args }));
  };

  const addToBuffer = (type, message, callback, error) => {
    messageBuffer.push([type, message, callback, error]);
  };

  const flushBuffer = () => {
    if (that.state !== that.CONNECTED) {
      return;
    }
    messageBuffer.forEach((message) => {
      that.sendMessage(...message);
    });
  };

  that.connect = (token, userOptions, callback = defaultCallback, error = defaultCallback) => {
    const options = {
      reconnection: true,
      reconnectionAttempts: 3,
      secure: token.secure,
      forceNew: true,
      transports: ['websocket'],
      rejectUnauthorized: false,
    };
    const transport = token.secure ? 'wss://' : 'ws://';
    const host = token.host;
    socket = that.IO.connect(transport + host, options);

    // Hack to know the exact reason of the WS closure (socket.io does not publish it)
    let closeCode = WEBSOCKET_NORMAL_CLOSURE;
    const socketOnCloseFunction = socket.io.engine.transport.ws.onclose;
    socket.io.engine.transport.ws.onclose = (closeEvent) => {
      Logger.warning('WebSocket closed, code:', closeEvent.code);
      closeCode = closeEvent.code;
      socketOnCloseFunction(closeEvent);
    };
    that.socket = socket;
    socket.on('onAddStream', emit.bind(that, 'onAddStream'));

    socket.on('signaling_message_erizo', emit.bind(that, 'signaling_message_erizo'));
    socket.on('signaling_message_peer', emit.bind(that, 'signaling_message_peer'));
    socket.on('publish_me', emit.bind(that, 'publish_me'));
    socket.on('unpublish_me', emit.bind(that, 'unpublish_me'));
    socket.on('onBandwidthAlert', emit.bind(that, 'onBandwidthAlert'));

    // We receive an event of new data in one of the streams
    socket.on('onDataStream', emit.bind(that, 'onDataStream'));

    // We receive an event of new data in one of the streams
    socket.on('onUpdateAttributeStream', emit.bind(that, 'onUpdateAttributeStream'));

    // We receive an event of a stream removed from the room
    socket.on('onRemoveStream', emit.bind(that, 'onRemoveStream'));

    socket.on('onAutomaticStreamsSubscription', emit.bind(that, 'onAutomaticStreamsSubscription'));

    // The socket has disconnected
    socket.on('disconnect', (reason) => {
      Logger.debug('disconnect', that.id, reason);
      if (closeCode !== WEBSOCKET_NORMAL_CLOSURE) {
        that.state = that.RECONNECTING;
        return;
      }
      emit('disconnect', reason);
      socket.close();
    });

    socket.on('connection_failed', (evt) => {
      Logger.error('connection failed, id:', that.id);
      emit('connection_failed', evt);
    });
    socket.on('error', (err) => {
      Logger.warning('socket error, id:', that.id, ', error:', err.message);
      emit('error');
    });
    socket.on('connect_error', (err) => {
      Logger.warning('connect error, id:', that.id, ', error:', err.message);
    });

    socket.on('connect_timeout', (err) => {
      Logger.warning('connect timeout, id:', that.id, ', error:', err.message);
    });

    socket.on('reconnecting', (attemptNumber) => {
      Logger.debug('reconnecting, id:', that.id, ', attempet:', attemptNumber);
    });

    socket.on('reconnect', (attemptNumber) => {
      Logger.debug('reconnected, id:', that.id, ', attempet:', attemptNumber);
      that.state = that.CONNECTED;
      socket.emit('reconnected', that.id);
      flushBuffer();
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      Logger.debug('reconnect attempt, id:', that.id, ', attempet:', attemptNumber);
    });

    socket.on('reconnect_error', (err) => {
      Logger.debug('error reconnecting, id:', that.id, ', error:', err.message);
    });

    socket.on('reconnect_failed', () => {
      Logger.warning('reconnect failed, id:', that.id);
      that.state = that.DISCONNECTED;
      emit('disconnect', 'reconnect failed');
    });

    // First message with the token
    const message = userOptions;
    message.token = token;
    that.sendMessage('token', message, (response) => {
      that.state = that.CONNECTED;
      that.id = response.clientId;
      callback(response);
    }, error);
  };

  that.disconnect = () => {
    that.state = that.DISCONNECTED;
    socket.disconnect();
  };

  // Function to send a message to the server using socket.io
  that.sendMessage = (type, msg, callback = defaultCallback, error = defaultCallback) => {
    if (that.state === that.DISCONNECTED && type !== 'token') {
      Logger.error('Trying to send a message over a disconnected Socket');
      return;
    }
    if (that.state === that.RECONNECTING) {
      addToBuffer(type, msg, callback, error);
      return;
    }
    socket.emit(type, msg, (respType, resp) => {
      if (respType === 'success') {
        callback(resp);
      } else if (respType === 'error') {
        error(resp);
      } else {
        callback(respType, resp);
      }
    });
  };

  // It sends a SDP message to the server using socket.io
  that.sendSDP = (type, options, sdp, callback = defaultCallback) => {
    if (that.state === that.DISCONNECTED) {
      Logger.error('Trying to send a message over a disconnected Socket');
      return;
    }
    socket.emit(type, options, sdp, (...args) => {
      callback(...args);
    });
  };
  return that;
};

export { SocketEvent, Socket };
