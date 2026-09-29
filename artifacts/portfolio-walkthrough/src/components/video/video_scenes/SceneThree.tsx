import { useState } from 'react';
import { motion } from 'framer-motion';
import { useSceneTimer } from '@/lib/video';

const EASE = [0.18, 0.78, 0.22, 1] as const;

export function SceneThree() {
  const [review, setReview] = useState(false);
  const [saved, setSaved] = useState(false);
  const [caption, setCaption] = useState(false);
  useSceneTimer([
    { time: 5000, callback: () => setReview(true) },
    { time: 8000, callback: () => setSaved(true) },
    { time: 10200, callback: () => setCaption(true) },
  ]);
  return (
    <motion.section className="film-scene" style={{ background: '#f3f1f7', color: '#201d39' }}
      initial={{ opacity: 0, x: 45, scale: .96, filter: 'blur(10px)' }}
      animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, rotateY: 12, scale: .94, filter: 'blur(10px)' }}
      transition={{ duration: .68, ease: EASE }}>
      <div className="film-soft-grid" style={{ position: 'absolute', inset: 0, opacity: .4 }} />
      <motion.div className="film-display" style={{ position: 'absolute', top: '8%', left: '6.5%', color: 'rgba(81,70,229,.06)', fontSize: '12vmin', fontWeight: 700, letterSpacing: '-.08em', whiteSpace: 'nowrap' }}
        initial={{ x: 75, opacity: 0 }} animate={{ x: -25, opacity: 1 }} transition={{ duration: 2.8, ease: EASE }}>
        YOUR DETAILS
      </motion.div>
      <div style={{ position: 'absolute', inset: '8% 8%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '29%', paddingRight: '3.5%', alignSelf: 'stretch', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <motion.p className="film-eyebrow" style={{ color: '#5146e5', margin: '0 0 1.7vmin' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .08, duration: .35 }}>
            02 / ADD MANUALLY
          </motion.p>
          <motion.h2 className="film-display" style={{ margin: 0, fontSize: '5.4vmin', lineHeight: .98, letterSpacing: '-.065em', fontWeight: 700 }}
            initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .18, duration: .52, ease: EASE }}>
            Or add it<br /><span style={{ color: '#5146e5' }}>yourself.</span>
          </motion.h2>
          <motion.p className="film-ui" style={{ color: '#777389', fontSize: '1.8vmin', lineHeight: 1.45, marginTop: '2.2vmin' }}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .56, duration: .38 }}>
            You control every project detail.
          </motion.p>
          <motion.div className="film-rule" style={{ width: '80%', marginTop: '2.4vmin', transformOrigin: 'left' }}
            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: .9, duration: .8 }} />
        </div>
        <motion.div className="film-card" style={{ width: '69%', padding: '2.1vmin 2.45vmin', position: 'relative', transformOrigin: 'center' }}
          initial={{ opacity: 0, y: 36, rotateX: 9, scale: .96 }} animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
          transition={{ delay: .22, duration: .72, ease: EASE }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.35vmin' }}>
            <div>
              <div className="film-eyebrow" style={{ color: '#878397', fontSize: '1.1vmin' }}>PORTFOLIO STUDIO</div>
              <div className="film-ui" style={{ fontSize: '2.05vmin', fontWeight: 700, marginTop: '.35vmin' }}>Add portfolio link</div>
            </div>
            <span style={{ color: '#5146e5', background: '#f0eeff', padding: '.7vmin 1.1vmin', borderRadius: '.7vmin', fontSize: '1.25vmin', fontWeight: 700 }}>MANUAL ENTRY</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.05vmin 1.35vmin' }}>
            {[
              ['TITLE', 'Northstar Identity', '0.6s'],
              ['DESCRIPTION', 'Brand identity and web experience.', '1.45s'],
              ['PROJECT LINK', 'https://northstar.design', '2.45s'],
              ['TAGS', 'Branding  ·  Web  ·  Product', '3.35s'],
            ].map(([label, value, delay], i) => (
              <motion.div key={label} style={{ gridColumn: i === 1 ? '1 / 3' : 'auto', minWidth: 0 }}
                initial={{ opacity: 0, y: 13 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Number.parseFloat(delay), duration: .36, ease: EASE }}>
                <div className="film-eyebrow" style={{ fontSize: '1.08vmin', color: '#777389', marginBottom: '.4vmin' }}>{label}</div>
                <div className="film-field" style={{ padding: '1.1vmin 1.25vmin', minHeight: '4.1vmin', fontSize: label === 'PROJECT LINK' ? '1.3vmin' : '1.48vmin', display: 'flex', alignItems: 'center', color: '#38344f', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                  {value}
                  {label === 'TITLE' && <motion.span style={{ width: '.18vmin', height: '1.7vmin', background: '#5146e5', marginLeft: '.45vmin' }} animate={{ opacity: [1, 0, 1] }} transition={{ duration: .7, repeat: 4, delay: .6 }} />}
                </div>
              </motion.div>
            ))}
          </div>
          {review && (
            <motion.div style={{ marginTop: '1.55vmin', paddingTop: '1.25vmin', borderTop: '1px solid #efedf5' }}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .38 }}>
              <div className="film-ui" style={{ fontSize: '1.42vmin', fontWeight: 700 }}>Review before saving</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '.7vmin', gap: '1vmin' }}>
                <span className="film-ui" style={{ color: '#777389', fontSize: '1.28vmin' }}>Source links stay private.</span>
                <span className="film-chip"><i className="film-lock" />PRIVATE</span>
              </div>
            </motion.div>
          )}
          {review && (
            <motion.div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.2vmin' }}
              initial={{ opacity: 0, scale: .94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: .25, duration: .3 }}>
              <span style={{ color: '#fff', background: '#5146e5', padding: '.9vmin 1.55vmin', borderRadius: '.75vmin', fontSize: '1.3vmin', fontWeight: 700 }}>
                {saved ? '✓ Project saved' : 'Confirm and save'}
              </span>
            </motion.div>
          )}
        </motion.div>
      </div>
      {saved && (
        <motion.div className="film-card" style={{ position: 'absolute', right: '6.5%', bottom: '8%', padding: '1.05vmin 1.5vmin', display: 'flex', alignItems: 'center', gap: '1vmin', borderRadius: '1vmin' }}
          initial={{ opacity: 0, y: 18, rotate: 2, scale: .9 }} animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 240, damping: 22 }}>
          <span style={{ width: '3.4vmin', height: '3.4vmin', borderRadius: '.75vmin', background: '#efedff', display: 'grid', placeItems: 'center', color: '#5146e5', fontSize: '1.8vmin' }}>✓</span>
          <span className="film-ui" style={{ fontSize: '1.35vmin', fontWeight: 700 }}>Northstar Identity</span>
          <span className="film-chip"><i className="film-lock" />PRIVATE</span>
        </motion.div>
      )}
      {caption && (
        <motion.div style={{ position: 'absolute', left: '8%', bottom: '8%', color: '#5146e5', fontWeight: 700, fontSize: '1.55vmin', maxWidth: '37%' }}
          initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .4 }}>
          Change the details before you confirm. You choose what appears in your hub.
        </motion.div>
      )}
      <motion.div style={{ position: 'absolute', right: '2%', top: '31%', width: '1.8vmin', height: '25vmin', borderRadius: 99, background: 'linear-gradient(#c9c3ff,rgba(201,195,255,0))', transformOrigin: 'top' }}
        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 1.1, duration: 1.3, ease: EASE }} />
    </motion.section>
  );
}