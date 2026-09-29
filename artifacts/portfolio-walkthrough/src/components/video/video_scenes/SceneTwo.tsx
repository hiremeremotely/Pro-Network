import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSceneTimer } from '@/lib/video';

const EASE = [0.18, 0.78, 0.22, 1] as const;

export function SceneTwo() {
  const [stage, setStage] = useState(0);
  useSceneTimer([
    { time: 3000, callback: () => setStage(1) },
    { time: 3900, callback: () => setStage(2) },
    { time: 5450, callback: () => setStage(3) },
    { time: 6300, callback: () => setStage(4) },
    { time: 7350, callback: () => setStage(5) },
    { time: 8550, callback: () => setStage(6) },
  ]);
  return (
    <motion.section className="film-scene film-soft-grid" style={{ background: '#f7f6fb', color: '#201d39' }}
      initial={{ opacity: 0, scale: 1.06, filter: 'blur(9px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: .94, x: -35, filter: 'blur(10px)' }}
      transition={{ duration: .7, ease: EASE }}>
      <div style={{ position: 'absolute', inset: '7% 6.5%', display: 'flex', alignItems: 'center', gap: '5.5%' }}>
        <div style={{ width: '27%', alignSelf: 'stretch', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <motion.p className="film-eyebrow" style={{ color: '#5a50d6', margin: '0 0 1.4vmin' }}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .38 }}>
            01 / BUILD FROM LINKS
          </motion.p>
          <motion.h2 className="film-display" style={{ margin: 0, fontSize: '5.6vmin', letterSpacing: '-.06em', lineHeight: .98, fontWeight: 700 }}
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .12, duration: .5, ease: EASE }}>
            Start<br />with links.
          </motion.h2>
          <motion.p className="film-ui" style={{ color: '#706c83', fontSize: '1.9vmin', lineHeight: 1.45, marginTop: '2vmin' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .55, duration: .4 }}>
            Add your own public work URLs. Nothing saves until you review it.
          </motion.p>
          <motion.div style={{ display: 'flex', alignItems: 'center', gap: '1vmin', marginTop: '2.6vmin', color: '#5146e5', fontWeight: 700, fontSize: '1.6vmin' }}
            initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .9, duration: .35 }}>
            <span style={{ width: '4vmin', height: '1px', background: '#8c82f5' }} /> PUBLIC + PERMITTED
          </motion.div>
        </div>
        <motion.div className="film-card" style={{ width: '68%', padding: '2.3vmin 2.6vmin', position: 'relative', transformOrigin: 'left center' }}
          initial={{ opacity: 0, x: 58, rotateY: -9, scale: .95 }} animate={{ opacity: 1, x: 0, rotateY: 0, scale: 1 }}
          transition={{ delay: .25, duration: .72, ease: EASE }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1.55vmin', borderBottom: '1px solid #efedf5' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.1vmin' }}>
              <span style={{ width: '3.3vmin', height: '3.3vmin', display: 'grid', placeItems: 'center', borderRadius: '1vmin', background: '#efedff', color: '#5146e5', fontSize: '1.9vmin' }}>↗</span>
              <div><div className="film-eyebrow" style={{ color: '#8b879a', fontSize: '1.15vmin' }}>PORTFOLIO STUDIO</div><div className="film-ui" style={{ fontWeight: 700, fontSize: '2vmin', marginTop: '.25vmin' }}>Build from your links</div></div>
            </div>
            <div className="film-mono" style={{ color: '#a09bad', fontSize: '1.2vmin' }}>SOURCE CHECK / 01</div>
          </div>
          <div style={{ marginTop: '1.8vmin' }}>
            <div className="film-eyebrow" style={{ fontSize: '1.2vmin', color: '#646079', marginBottom: '.8vmin' }}>YOUR PUBLIC WORK LINKS</div>
            <motion.div className="film-field film-mono" style={{ position: 'relative', padding: '1.25vmin 1.4vmin', fontSize: '1.55vmin', marginBottom: '.7vmin', display: 'flex', gap: '1vmin' }}
              initial={{ opacity: 0, x: 26 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .58, duration: .4 }}>
              <span style={{ color: '#5146e5' }}>↗</span> https://github.com/yourname
              <motion.span style={{ width: '.22vmin', background: '#695ee8', height: '1.5em', marginLeft: 'auto' }} animate={{ opacity: [1, 0, 1] }} transition={{ duration: .8, repeat: 3 }} />
            </motion.div>
            <motion.div className="film-field film-mono" style={{ padding: '1.25vmin 1.4vmin', fontSize: '1.55vmin', display: 'flex', gap: '1vmin' }}
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .95, duration: .4 }}>
              <span style={{ color: '#5146e5' }}>↗</span> https://your-portfolio.com/projects
            </motion.div>
            <motion.div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.1vmin' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.22, duration: .3 }}>
              <span className="film-ui" style={{ fontSize: '1.35vmin', color: '#827e92' }}>Only public, permitted page metadata is used.</span>
              <span style={{ color: '#5146e5', fontWeight: 700, fontSize: '1.45vmin', borderRadius: '.75vmin', padding: '.9vmin 1.5vmin', background: '#efedff' }}>Find work</span>
            </motion.div>
          </div>
          <motion.div className="film-rule" style={{ margin: '1.5vmin 0 1.1vmin', transformOrigin: 'left' }}
            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 1.55, duration: .62, ease: EASE }} />
          <div style={{ minHeight: '3vmin', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <AnimatePresence mode="sync">
              <motion.span key={stage > 1 ? 'found' : stage > 0 ? 'checking' : 'ready'}
                className="film-ui" style={{ fontSize: '1.5vmin', color: stage > 1 ? '#16865e' : '#716d82', fontWeight: 700 }}
                initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -7 }} transition={{ duration: .2 }}>
                {stage > 1 ? '2 project drafts found' : stage > 0 ? 'Checking sources…' : 'Ready to check'}
              </motion.span>
            </AnimatePresence>
            {stage <= 1 && <motion.span style={{ fontSize: '1.2vmin', color: '#aaa6b6' }} animate={{ opacity: stage === 1 ? 1 : .5 }}>SOURCE LINK</motion.span>}
          </div>
          {stage >= 2 && (
            <motion.div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1vmin', marginTop: '1vmin' }}
              initial={{ opacity: 0, y: 23, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: .5, ease: EASE }}>
              {[
                { name: stage >= 4 ? 'Atlas — onboarding' : 'Atlas', tags: 'UX  ·  Research', description: 'Product design' },
                { name: 'Northstar', tags: 'Branding  ·  Web', description: 'Web experience' },
              ].map((item, i) => (
                <motion.div key={item.name} className="film-field" style={{ padding: '1.2vmin 1.35vmin', borderRadius: '1.05vmin', background: i === 0 ? '#fcfbff' : '#fff' }}
                  initial={{ opacity: 0, y: 18, rotateX: 8 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ delay: i * .17, duration: .45 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <strong className="film-ui" style={{ fontSize: '1.62vmin' }}>{item.name}</strong>
                    <span style={{ width: '1.5vmin', height: '1.5vmin', border: '1px solid #8b82eb', borderRadius: '.35vmin', background: i === 0 ? '#756bea' : '#fff' }} />
                  </div>
                  <div className="film-ui" style={{ color: '#716d83', fontSize: '1.2vmin', marginTop: '.35vmin' }}>{item.description}</div>
                  <div className="film-ui" style={{ color: '#5e56bf', fontSize: '1.1vmin', marginTop: '.45vmin' }}>{item.tags}</div>
                </motion.div>
              ))}
            </motion.div>
          )}
          {stage >= 3 && (
            <motion.div style={{ marginTop: '1.1vmin', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .35 }}>
              <div>
                <div className="film-ui" style={{ fontWeight: 700, fontSize: '1.4vmin' }}>Review suggested cards</div>
                <div className="film-ui" style={{ color: '#858195', fontSize: '1.15vmin', marginTop: '.2vmin' }}>Nothing is saved yet.</div>
              </div>
              <span className="film-chip"><i className="film-lock" />PRIVATE</span>
            </motion.div>
          )}
          {stage >= 5 && (
            <motion.div style={{ display: 'flex', alignItems: 'center', gap: '1vmin', marginTop: '1.05vmin' }}
              initial={{ opacity: 0, scale: .94 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }}>
              <span style={{ flex: 1, height: '1px', background: '#dedaf0' }} />
              <span style={{ color: '#fff', background: '#5146e5', padding: '.95vmin 1.55vmin', borderRadius: '.8vmin', fontWeight: 700, fontSize: '1.35vmin' }}>
                {stage >= 6 ? '✓ Saved to portfolio' : 'Confirm and save 2 cards'}
              </span>
            </motion.div>
          )}
        </motion.div>
      </div>
      {stage >= 6 && (
        <motion.div className="film-ui" style={{ position: 'absolute', left: '7%', bottom: '6.8%', color: '#5c54be', fontSize: '1.5vmin', fontWeight: 700, letterSpacing: '.03em' }}
          initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .45 }}>
          You review each suggestion first.
        </motion.div>
      )}
      <motion.div style={{ position: 'absolute', top: '9%', right: '6.5%', width: '5vmin', height: '5vmin', border: '1px solid rgba(81,70,229,.22)', borderRadius: '1.2vmin', transform: 'rotate(45deg)' }}
        animate={{ rotate: [45, 54, 45], scale: [1, 1.06, 1] }} transition={{ duration: 5.5, ease: 'easeInOut', repeat: Infinity }} />
    </motion.section>
  );
}