import Peer, { MediaConnection } from "peerjs";
import { CSSProperties, FC, useEffect, useMemo, useRef, useState } from "react"
import { useRouteMatch } from "react-router";
import io from "socket.io-client";
import { v4 as uuid } from "uuid"



const videoStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
}

export const Room: FC = () => {

  const { params } = useRouteMatch<{ room: string }>()

  const [peers, setPeers] = useState<{ id: string, call: MediaConnection }[]>([])

  const userVideoRef = useRef<HTMLVideoElement>(null)

  const peer = useMemo(() => new Peer(undefined, {
    host: 'localhost',
    port: 5000
  }), [])

  const socket = useMemo(() => io("http://localhost:4000", { transports: ["websocket"], withCredentials: true }), [])

  useEffect(() => {
    const onOpen = (id: string): void => {
      console.log(`Peer Connection Open: ${id}`)
      socket.emit('join-room', params?.room, id);
    };
    const onPeerError: (err: any) => void = (err) => {
      alert("Failed to init peer");
      console.error("[peer-js]:", err);
    };
    const onSocketConnectError = (err: Error): void => {
      alert("Failed to connect socket");
      console.error("[socket-io]:", err);
    };

    peer.on('open', onOpen)
    peer.on("error", onPeerError)
    socket.on("connect_error", onSocketConnectError)

    return () => {
      peer.off('open', onOpen)
      peer.off('error', onPeerError)
      socket.off("connect_error", onSocketConnectError)
    }
  }, [])

  useEffect(() => {
    if (userVideoRef.current) {

      navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then((stream) => {
        // local user video stream
        if (userVideoRef?.current) userVideoRef.current.srcObject = stream

        // if calling from another browser then answer with my stream
        peer.on('call', call => {
          console.log("Somebody's calling: ", call)
          call.answer(stream)
          setPeers(prev => [...prev, { id: uuid(), call }])
        })

        socket.on('user-connected', userId => {
          console.log('New user connection:', userId)
          connectToNewUser(userId, stream)
        })

        // 'stream' event is missed because it is fired before 
        // the new user completes the navigator media promise.
        // When a new user connects, we are getting an userId from socket
        // and we immediately call connectToNewUser(userId, stream) without 
        // waiting till the time new client finishes the promise
        // thus emit-listening another event to let the new user finish
        // it's navigator.mediaDevices.getUserMedia() Promise before socket
        // connection
        socket.on('new-user-connected', userId => {
          if (userId != peer.id) {
            console.log("new-user-connected (2): ", userId);
            connectToNewUser(userId, stream);
          }
        })
        socket.emit('connection-request', params.room, peer.id);
      })
      return () => {
        peer.destroy()
      }
    }
  }, [])



  useEffect(() => {
    const onUserDisconnected = (userId: string) => {
      console.log(`User disconnected ${userId}`)
      peers.find(({ id }) => id === userId)?.call.close();
      setPeers(peers.filter(({ id }) => id === userId))
    };
    socket.on('user-disconnected', onUserDisconnected)

    return () => {
      socket.off("user-disconnected", onUserDisconnected)
    }
  }, [peers])



  const connectToNewUser = (userId: string, stream: MediaStream) => {
    const call = peer.call(userId, stream)
    setPeers((prev) => {
      // ensuring no duplicates
      prev = prev.filter(({ id }) => id !== userId)
      return [...prev, { id: userId, call }]
    })
  }

  console.table(peers)

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, 300px)",
      gridAutoRows: "300px",
    }}>
      <video ref={userVideoRef} autoPlay muted style={videoStyle}></video>
      {
        peers.map(({ id, call }) => <Video key={id} call={call} />)
      }
    </div>
  )
}

interface VideoProps {
  call: MediaConnection
};

export const Video: FC<VideoProps> = ({ call }) => {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const onCallStream = (stream: MediaStream): void => {
      console.log("Call streaming: ", stream)
      if (videoRef?.current)
        videoRef.current.srcObject = stream;
    };
    const onCallClose = () => {
      console.log("Call ended")
      videoRef.current?.remove();
    };

    call.on('stream', onCallStream)
    call.on('close', onCallClose)

    return () => {
      call.off('stream', onCallStream)
      call.off('close', onCallClose)
    }

  }, [call, videoRef])

  return (
    <video ref={videoRef} style={videoStyle} autoPlay></video>
  )
}
