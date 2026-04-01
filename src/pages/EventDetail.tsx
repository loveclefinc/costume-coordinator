import { useParams } from 'react-router-dom'

export default function EventDetail() {
  const { id } = useParams()
  
  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>イベント詳細 (ID: {id})</h1>
      <p>イベント詳細情報はここに表示されます</p>
    </div>
  )
}
