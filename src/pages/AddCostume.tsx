import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

export default function AddCostume() {
  const navigate = useNavigate()
  const [name, setName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Add costume to database
    navigate('/costumes')
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>衣装を追加</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem' }}>
            衣装名
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="衣装の名前を入力"
            required
            style={{ width: '100%' }}
          />
        </div>
        <button type="submit" style={{ padding: '10px 20px', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          追加
        </button>
      </form>
    </div>
  )
}
