import { Link } from 'react-router-dom'

export default function Costumes() {
  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>衣装管理</h1>
      <Link to="/costumes/add" style={{ 
        display: 'inline-block',
        padding: '10px 20px',
        backgroundColor: 'var(--primary)',
        color: 'white',
        borderRadius: '8px',
        textDecoration: 'none',
        marginBottom: '2rem'
      }}>
        新しい衣装を追加
      </Link>
      <p>衣装リストはここに表示されます</p>
    </div>
  )
}
