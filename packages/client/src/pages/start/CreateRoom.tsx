import React, { FC } from "react"
import { Link } from "react-router-dom"
import { v4 } from "uuid"

export const CreateRoom: FC = () => {
  return (
    <>
      <Link to={`/${v4()}`}>
        <button>Create Room</button>
      </Link>
    </>
  )
}
