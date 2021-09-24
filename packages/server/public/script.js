const socket = io('/')
const videoGrid = document.getElementById('video-grid')
const myPeer = new Peer(undefined, {
  host: '/',
  port: '5000'
})
const myVideo = document.createElement('video')
myVideo.muted = true
const peers = {}
navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
}).then(stream => {
  addVideoStream(myVideo, stream)

  myPeer.on('call', call => {
    console.log('call:', call)
    call.answer(stream)
    const video = document.createElement('video')
    call.on('stream', userVideoStream => {
      addVideoStream(video, userVideoStream)
    })
  })

  socket.on('user-connected', userId => {
    connectToNewUser(userId, stream)
  })

  socket.on('new-user-connected', userId => {
    if (userId != myPeer.id) {
      console.log("New user: " + userId);
      connectToNewUser(userId, stream);
    }
  })

  socket.emit('connection-request',ROOM_ID,myPeer.id);
})

socket.on('user-disconnected', userId => {
  if (peers[userId]) peers[userId].close()
})

myPeer.on('open', id => {
  socket.emit('join-room', ROOM_ID, id)
})

function connectToNewUser(userId, stream) {
  console.log('userId:', userId)
  const call = myPeer.call(userId, stream)
  const video = document.createElement('video')
  call.on('stream', userVideoStream => {
    console.log('userVideoStream:', userVideoStream)
    addVideoStream(video, userVideoStream)
  })
  call.on('error', (error) => {
    console.log(error)
    alert(`Calling user ${userId} failed!`)
  })
  call.on('close', () => {
    video.remove()
  })

  peers[userId] = call
}

function addVideoStream(video, stream) {
  if ('srcObject' in video) {
    video.srcObject = stream
  }
  else {
    video.src = window.URL.createObjectURL(stream)
  }
  video.addEventListener('loadedmetadata', () => {
    video.play()
  })
  videoGrid.append(video)
}