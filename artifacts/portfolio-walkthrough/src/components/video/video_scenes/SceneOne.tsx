import { motion } from 'framer-motion';
import { LinkGlyph } from '../LinkGlyph';

const EASE = [0.18, 0.78, 0.22, 1] as const;

export function SceneOne() {
  return (
    <motion.section
      className="film-scene"
      style={{ background: '#191735', color: '#fff' }}
      initial={{ opacity: 0, scale: 1.035 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.12, filter: 'blur(12px)' }}
      transition={{ duration: 0.55, ease: EASE }}
    >
      <div className="film-soft-grid" style={{ position: 'absolute', inset: 0, opacity: .48 }} />
      <motion.div
        style={{
          position: 'absolute', width: '54vmin', height: '54vmin', left: '48%', top: '48%',
          border: '1px solid rgba(168,157,255,.14)', borderRadius: '50%', transform: 'translate(-50%,-50%)',
        }}
        initial={{ scale: .12, opacity: 0 }}
        animate={{ scale: 1.14, opacity: 1 }}
        transition={{ duration: 1.2, ease: EASE }}
      />
      <motion.div
        style={{ position: 'absolute', left: '50%', top: '48%', width: '9vmin', height: '9vmin', opacity: .8, transform: 'translate(-50%,-50%)' }}
        initial={false}
        animate={{ left: '45%', top: '32%', width: '20vmin', height: '20vmin', scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 270, damping: 24, delay: .1 }}
      >
        <LinkGlyph size={220} animated />
      </motion.div>
      <div style={{ position: 'absolute', inset: '7% 7% 7% 7%', display: 'flex', alignItems: 'center' }}>
        <div style={{ width: '49%', zIndex: 2 }}>
          <motion.p className="film-eyebrow" style={{ color: '#b5adff', margin: '0 0 2.2vmin' }}
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .12, duration: .4 }}>
            PROCONNECT / PORTFOLIO
          </motion.p>
          <motion.h1 className="film-display" style={{ fontSize: '8.4vmin', lineHeight: .91, letterSpacing: '-.065em', fontWeight: 700, margin: 0, maxWidth: '55vmin' }}
            initial={{ clipPath: 'inset(0 0 100% 0)', y: 25 }} animate={{ clipPath: 'inset(0 0 0% 0)', y: 0 }}
            transition={{ duration: .65, delay: .24, ease: EASE }}>
            YOUR WORK,<br /><span style={{ color: '#b4aaff' }}>TOGETHER.</span>
          </motion.h1>
          <motion.p className="film-ui" style={{ color: 'rgba(255,255,255,.68)', fontSize: '2.4vmin', lineHeight: 1.35, marginTop: '2.4vmin', maxWidth: '38vmin' }}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .82, duration: .42 }}>
            Start from links or add a project yourself.
          </motion.p>
          <motion.div style={{ display: 'flex', alignItems: 'center', gap: '1vmin', marginTop: '3vmin', color: '#c8c1ff', fontSize: '1.6vmin', fontWeight: 700 }}
            initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.22, duration: .45 }}>
            <span style={{ width: '4.4vmin', height: '1px', background: '#a89dff' }} />
            PROFILE / PORTFOLIO
          </motion.div>
        </div>
        <motion.div
          className="film-card"
          style={{ position: 'absolute', right: '0%', top: '20%', width: '40%', padding: '2.4vmin', color: '#211d3d', transformOrigin: 'center' }}
          initial={{ opacity: 0, x: 72, rotateY: -16, rotateZ: 2, scale: .94 }}
          animate={{ opacity: 1, x: 0, rotateY: 0, rotateZ: 0, scale: 1 }}
          transition={{ delay: .62, duration: .8, ease: EASE }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2vmin' }}>
            <div>
              <p className="film-eyebrow" style={{ color: '#79748f', fontSize: '1.25vmin', margin: '0 0 .55vmin' }}>PORTFOLIO STUDIO</p>
              <div className="film-display" style={{ fontSize: '2.7vmin', fontWeight: 700, letterSpacing: '-.04em' }}>Bring your work together</div>
            </div>
            <div style={{ width: '4.8vmin', height: '4.8vmin', borderRadius: '1.2vmin', display: 'grid', placeItems: 'center', background: '#f0eeff' }}>
              <LinkGlyph size={38} color="#5146e5" />
            </div>
          </div>
          <motion.div className="film-field" style={{ padding: '1.7vmin', display: 'flex', gap: '1.4vmin', alignItems: 'center', marginBottom: '1.1vmin' }}
            initial={{ x: 18, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 1.05, duration: .35 }}>
            <span style={{ color: '#5146e5', fontSize: '2.3vmin' }}>↗</span>
            <span className="film-ui" style={{ fontSize: '1.85vmin', fontWeight: 650 }}>Build from links</span>
            <span style={{ marginLeft: 'auto', color: '#5146e5', fontSize: '2vmin' }}>↗</span>
          </motion.div>
          <motion.div className="film-field" style={{ padding: '1.7vmin', display: 'flex', gap: '1.4vmin', alignItems: 'center' }}
            initial={{ x: 22, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 1.4, duration: .35 }}>
            <span style={{ color: '#5146e5', fontSize: '2.3vmin' }}>＋</span>
            <span className="film-ui" style={{ fontSize: '1.85vmin', fontWeight: 650 }}>Add manually</span>
            <span style={{ marginLeft: 'auto', color: '#5146e5', fontSize: '2vmin' }}>↗</span>
          </motion.div>
          <motion.p className="film-ui" style={{ fontSize: '1.55vmin', color: '#77738a', margin: '1.8vmin 0 0', borderTop: '1px solid #eeecf4', paddingTop: '1.5vmin' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.75, duration: .35 }}>
            Review before saving.
          </motion.p>
        </motion.div>
      </div>
      <motion.div style={{ position: 'absolute', bottom: '7%', left: '7%', width: '86%', height: '1px', background: 'linear-gradient(90deg,rgba(168,157,255,.7),rgba(168,157,255,0))', transformOrigin: 'left' }}
        initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 2.1, duration: 1.7, ease: EASE }} />
    </motion.section>
  );
}