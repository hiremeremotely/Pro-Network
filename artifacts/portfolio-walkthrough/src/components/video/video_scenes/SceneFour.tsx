import { useState } from 'react';
import { motion } from 'framer-motion';
import { useSceneTimer } from '@/lib/video';
import { LinkGlyph } from '../LinkGlyph';

const EASE = [0.18, 0.78, 0.22, 1] as const;

export function SceneFour() {
  const [end, setEnd] = useState(false);
  const [loopMark, setLoopMark] = useState(false);
  useSceneTimer([
    { time: 6100, callback: () => setEnd(true) },
    { time: 8350, callback: () => setLoopMark(true) },
  ]);
  return (
    <motion.section className="film-scene" style={{ background: '#f7f6fb', color: '#201d39', perspective: 1500 }}
      initial={{ opacity: 0, clipPath: 'polygon(0 0,100% 0,100% 100%,0 100%)' }}
      animate={{ opacity: 1, clipPath: 'polygon(0 0,100% 0,100% 100%,0 100%)' }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: .55, ease: EASE }}>
      <motion.div className="film-soft-grid" style={{ position: 'absolute', inset: 0, opacity: end ? 0 : .34 }}
        animate={{ opacity: end ? 0 : .34 }} transition={{ duration: .7 }} />
      {!end && (
        <motion.div style={{ position: 'absolute', inset: '9% 7%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
          animate={{ opacity: end ? 0 : 1, scale: end ? .94 : 1 }} transition={{ duration: .65, ease: EASE }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: '2.2vmin' }}>
            <div>
              <motion.p className="film-eyebrow" style={{ color: '#5146e5', margin: '0 0 1vmin' }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .1, duration: .3 }}>
                YOUR PORTFOLIO
              </motion.p>
              <motion.h2 className="film-display" style={{ fontSize: '5.8vmin', lineHeight: .95, letterSpacing: '-.065em', margin: 0, fontWeight: 700 }}
                initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .04, duration: .5, ease: EASE }}>
                Review. Save. Choose.
              </motion.h2>
            </div>
            <motion.div style={{ color: '#6f6b83', fontSize: '1.65vmin', fontWeight: 650, marginBottom: '.6vmin' }}
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .4, duration: .4 }}>
              Two ways to bring your work together.
            </motion.div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2vmin' }}>
            {[
              { title: 'Atlas — onboarding', from: 'FROM LINKS', tags: 'UX  ·  Research', start: .2 },
              { title: 'Northstar Identity', from: 'ADDED MANUALLY', tags: 'Branding  ·  Web', start: .72 },
            ].map((item, i) => (
              <motion.div key={item.title} className="film-card" style={{ padding: '2.1vmin 2.2vmin', minHeight: '17vmin', position: 'relative', overflow: 'hidden' }}
                initial={{ opacity: 0, y: 32, rotateY: i === 0 ? -9 : 9, scale: .94 }}
                animate={{ opacity: 1, y: 0, rotateY: 0, scale: 1 }}
                transition={{ delay: item.start, duration: .62, ease: EASE }}>
                <div style={{ position: 'absolute', width: '22vmin', height: '22vmin', right: '-5vmin', top: '-13vmin', borderRadius: '50%', border: '1px solid rgba(81,70,229,.15)' }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="film-eyebrow" style={{ fontSize: '1.12vmin', color: '#898599' }}>{item.from}</span>
                  <span className="film-chip"><i className="film-lock" />PRIVATE</span>
                </div>
                <h3 className="film-display" style={{ fontSize: '2.9vmin', margin: '1.8vmin 0 .55vmin', letterSpacing: '-.04em' }}>{item.title}</h3>
                <p className="film-ui" style={{ fontSize: '1.45vmin', color: '#777389', margin: 0 }}>Reviewed project summary</p>
                <div style={{ display: 'flex', gap: '.7vmin', marginTop: '1.45vmin' }}>
                  {item.tags.split('  ·  ').map(tag => <span key={tag} style={{ color: '#5146e5', background: '#f0eeff', borderRadius: '999px', fontSize: '1.15vmin', fontWeight: 650, padding: '.5vmin .9vmin' }}>{tag}</span>)}
                </div>
              </motion.div>
            ))}
          </div>
          <motion.div style={{ display: 'flex', alignItems: 'center', gap: '1.3vmin', marginTop: '1.8vmin' }}
            initial={{ opacity: 0, scaleX: 0, transformOrigin: 'left' }} animate={{ opacity: 1, scaleX: 1 }} transition={{ delay: 1.3, duration: .7, ease: EASE }}>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg,#8f85ef,#d9d6eb)' }} />
            <span style={{ color: '#5146e5', fontSize: '1.45vmin', fontWeight: 700, whiteSpace: 'nowrap' }}>Both start private.</span>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg,#d9d6eb,#8f85ef)' }} />
          </motion.div>
          <motion.p className="film-ui" style={{ fontSize: '1.45vmin', lineHeight: 1.45, color: '#6f6b83', margin: '1.35vmin 0 0', maxWidth: '77%' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.75, duration: .45 }}>
            External source links stay private until you approve their release in an introduction.
          </motion.p>
        </motion.div>
      )}
      <motion.div className="film-scene" style={{ position: 'absolute', inset: 0, background: '#191735', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        initial={{ clipPath: 'inset(0 100% 0 0)', opacity: 1 }}
        animate={{ clipPath: end ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)', opacity: 1 }}
        transition={{ duration: end ? .75 : 0, ease: EASE }}>
        <motion.div className="film-soft-grid" style={{ position: 'absolute', inset: 0, opacity: 0 }}
          animate={{ opacity: end ? .48 : 0 }} transition={{ duration: .7 }} />
        <motion.div style={{ position: 'absolute', left: '48%', top: '48%', width: '54vmin', height: '54vmin', border: '1px solid rgba(168,157,255,.14)', borderRadius: '50%', transform: 'translate(-50%,-50%)' }}
          initial={{ scale: .12, opacity: 0 }} animate={{ scale: end ? 1.14 : .12, opacity: end ? 1 : 0 }}
          transition={{ duration: .9, ease: EASE }} />
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 1 }}>
        <motion.div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}
          initial={{ opacity: 0, scale: .82 }} animate={{ opacity: end && !loopMark ? 1 : 0, scale: end && !loopMark ? 1 : .82 }}
          transition={{ duration: .65, ease: EASE, delay: end ? .52 : 0 }}>
          <motion.div style={{ margin: '0 auto 1.5vmin', width: '9vmin', height: '9vmin', display: 'grid', placeItems: 'center' }}
            initial={{ scale: 1.55, rotate: -12 }} animate={{ scale: end && !loopMark ? .72 : 1.55, rotate: end ? 0 : -12, opacity: loopMark ? 0 : 1 }}
            transition={{ duration: .8, ease: EASE }}>
            <LinkGlyph size="9vmin" animated />
          </motion.div>
          <div className="film-display" style={{ color: '#fff', fontSize: '4.4vmin', letterSpacing: '-.045em', fontWeight: 700 }}>ProConnect</div>
          <motion.div className="film-ui" style={{ color: '#c7c2eb', fontSize: '1.85vmin', marginTop: '1.1vmin' }}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: end ? 1 : 0, y: end ? 0 : 8 }}
            transition={{ duration: .38, delay: end ? .95 : 0 }}>
            Your work, on your terms.
          </motion.div>
        </motion.div>
        <motion.div style={{ position: 'absolute', left: '50%', top: '48%', width: '9vmin', height: '9vmin', transform: 'translate(-50%,-50%)', display: 'grid', placeItems: 'center' }}
          initial={false}
          animate={{ opacity: loopMark ? 1 : 0, scale: loopMark ? 1 : .72, rotate: 0 }}
          transition={{ duration: .65, ease: EASE }}>
          <LinkGlyph size="9vmin" />
        </motion.div>
        </div>
      </motion.div>
    </motion.section>
  );
}