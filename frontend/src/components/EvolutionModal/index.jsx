import { useState, useEffect } from 'react';
import Modal from '../Modal';
import Button from '../Button';
import './index.scss';

const EvolutionModal = ({ visible, pokemon, evolutionInfo, onConfirm, onCancel }) => {
  const [isEvolving, setIsEvolving] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsEvolving(false);
      setShowAnimation(false);
    }
  }, [visible]);

  const handleEvolution = async () => {
    setIsEvolving(true);
    setShowAnimation(true);
    
    // 等待动画播放一段时间后执行进化
    setTimeout(async () => {
      await onConfirm();
      setIsEvolving(false);
      setShowAnimation(false);
    }, 2000);
  };

  // 安全检查
  if (!visible || !pokemon || !evolutionInfo) return null;

  // 检查是否有进化形态
  const hasNextEvolution = evolutionInfo.canEvolve && evolutionInfo.nextEvolution;

  return (
    <Modal
      visible={visible}
      title="🌟 宝可梦进化"
      onCancel={onCancel}
      footer={false}
      width={600}
    >
      <div className="evolution-modal">
        {!showAnimation ? (
          <>
            <div className="evolution-preview">
              <div className="evolution-pokemon current">
                <img 
                  src={pokemon.pokemon_sprite || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.pokemon_id}.png`}
                  alt={pokemon.pokemon_name}
                />
                <h3>{pokemon.pokemon_name}</h3>
                <p>Lv.{pokemon.level}</p>
              </div>

              <div className="evolution-arrow">
                <span>→</span>
              </div>

              <div className="evolution-pokemon next">
                {hasNextEvolution ? (
                  <>
                    <img 
                      src={evolutionInfo.nextEvolution.sprite}
                      alt={evolutionInfo.nextEvolution.name}
                    />
                    <h3>{evolutionInfo.nextEvolution.name}</h3>
                    <p className="evolution-new-badge">✨ 新形态</p>
                  </>
                ) : (
                  <>
                    <div style={{ width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>
                      🏆
                    </div>
                    <h3>最终形态</h3>
                    <p>已达巅峰</p>
                  </>
                )}
              </div>
            </div>

            <div className="evolution-info">
              <h4>进化信息</h4>
              {hasNextEvolution ? (
                <>
                  <p>• 当前等级: Lv.{evolutionInfo.currentLevel}</p>
                  <p>• 进化阶段: {evolutionInfo.currentStage}/{evolutionInfo.totalStages}</p>
                  {!evolutionInfo.canEvolveNow && (
                    <p className="evolution-warning">
                      ⚠️ 需要达到 Lv.{evolutionInfo.requiredLevel} 才能进化
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p>• 当前等级: Lv.{evolutionInfo.currentLevel || pokemon.level}</p>
                  <p>• {evolutionInfo.message || `${pokemon.pokemon_name} 已经是最终形态`}</p>
                  <p style={{ marginTop: '15px', padding: '10px', background: '#f0f8ff', borderRadius: '6px', color: '#1976d2' }}>
                    🎉 恭喜！你的宝可梦已经达到了最强形态！
                  </p>
                </>
              )}
            </div>

            <div className="evolution-actions">
              {hasNextEvolution && evolutionInfo.canEvolveNow ? (
                <>
                  <Button onClick={handleEvolution} type="primary" loading={isEvolving}>
                    ✨ 确认进化
                  </Button>
                  <Button onClick={onCancel}>
                    取消
                  </Button>
                </>
              ) : (
                <Button onClick={onCancel}>
                  关闭
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="evolution-animation">
            <div className="evolution-light">
              <div className="pokemon-evolving">
                <img 
                  src={pokemon.pokemon_sprite || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.pokemon_id}.png`}
                  alt={pokemon.pokemon_name}
                  className="fade-out"
                />
                {hasNextEvolution && (
                  <img 
                    src={evolutionInfo.nextEvolution.sprite}
                    alt={evolutionInfo.nextEvolution.name}
                    className="fade-in"
                  />
                )}
              </div>
              <p className="evolution-text">进化中...</p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default EvolutionModal;