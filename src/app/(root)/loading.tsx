import { Loader } from 'lucide-react'
import React from 'react'

const Loading = () => {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex items-center space-x-3 bg-white p-6 rounded-lg shadow-md">
          <Loader size={24} className="animate-spin text-blue-600" />
          <p className="text-gray-800 font-medium">
            Loading details...
          </p>
        </div>
      </div>
  )
}

export default Loading