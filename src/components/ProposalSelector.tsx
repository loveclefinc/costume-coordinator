import { useState } from 'react'
import { OptimizationProposal, OptimizationResult } from '../utils/optimizer-multi'
import '../styles/ProposalSelector.css'

interface ProposalSelectorProps {
  proposals: OptimizationProposal[]
  onSelectProposal: (proposal: OptimizationProposal) => void
  isLoading?: boolean
}

export default function ProposalSelector({ proposals, onSelectProposal, isLoading = false }: ProposalSelectorProps) {
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(proposals[0]?.proposalId || null)

  const handleSelectProposal = (proposal: OptimizationProposal) => {
    setSelectedProposalId(proposal.proposalId)
    onSelectProposal(proposal)
  }

  if (isLoading) {
    return (
      <div className="proposal-selector">
        <div className="proposal-loading">
          <div className="spinner"></div>
          <p>提案を生成中...</p>
        </div>
      </div>
    )
  }

  if (proposals.length === 0) {
    return (
      <div className="proposal-selector">
        <div className="proposal-empty">
          <p>提案を生成してください</p>
        </div>
      </div>
    )
  }

  return (
    <div className="proposal-selector">
      <div className="proposal-header">
        <h3>🎨 複数の衣装提案</h3>
        <p className="proposal-subtitle">最適な組み合わせを選択してください</p>
      </div>

      <div className="proposal-list">
        {proposals.map((proposal, index) => (
          <div
            key={proposal.proposalId}
            className={`proposal-card ${selectedProposalId === proposal.proposalId ? 'selected' : ''}`}
            onClick={() => handleSelectProposal(proposal)}
          >
            <div className="proposal-card-header">
              <div className="proposal-rank">提案 {index + 1}</div>
              <div className="proposal-score">
                <span className="score-label">調和スコア</span>
                <span className="score-value">{(proposal.harmonyScore * 100).toFixed(1)}%</span>
              </div>
            </div>

            <div className="proposal-assignments">
              {proposal.assignments.map((assignment) => (
                <div key={assignment.participantId} className="assignment-item">
                  <div className="assignment-participant">
                    <span className="participant-name">{assignment.participantName}</span>
                  </div>
                  <div className="assignment-costume">
                    {assignment.costume.image && (
                      <img
                        src={assignment.costume.image}
                        alt={assignment.costume.name}
                        className="costume-thumbnail"
                      />
                    )}
                    <div className="costume-info">
                      <div className="costume-name">{assignment.costume.name}</div>
                      <div className="costume-details">
                        <span className="detail-badge">{assignment.costume.tone}</span>
                        <span className="detail-badge">{assignment.costume.pattern}</span>
                      </div>
                      <div className="assignment-score">
                        スコア: {(assignment.score * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="proposal-reasons">
              <details>
                <summary>詳細を表示</summary>
                <div className="reasons-content">
                  {proposal.assignments.map((assignment) => (
                    <div key={assignment.participantId} className="reason-item">
                      <strong>{assignment.participantName}</strong>
                      <ul>
                        {assignment.reason.map((reason, idx) => (
                          <li key={idx}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </details>
            </div>

            {selectedProposalId === proposal.proposalId && (
              <div className="proposal-selected-badge">✓ 選択中</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
