import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronDown, Calendar } from 'lucide-react';
import { photoService, getImageUrl } from '../services/api';
import { getMonthName, formatDate } from '../utils/helpers';
import PhotoViewer from '../components/PhotoViewer';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

function TimelineMonth({ group, onPhotoClick }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      <button
        className="flex items-center gap-3 w-full text-left py-3 group"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 flex items-baseline gap-3">
          <span className="font-serif text-2xl font-bold text-text">
            {MONTHS[group.month - 1]}
          </span>
          <span className="text-muted text-base">{group.year}</span>
        </div>
        <ChevronDown
          size={18}
          className={`text-muted transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="space-y-6 pb-8 border-l-2 border-border ml-4 pl-6">
              {group.days.map(({ day, photos }) => (
                <div key={day}>
                  {/* Day label */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-accent -ml-7 flex-shrink-0" />
                    <Calendar size={13} className="text-muted" />
                    <span className="text-sm font-medium text-text">
                      {MONTHS[group.month - 1]} {day}
                    </span>
                    <span className="text-xs text-muted">
                      · {photos.length} photo{photos.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Photos row */}
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {photos.map((photo, i) => (
                      <div
                        key={photo._id}
                        className="relative flex-shrink-0 w-32 h-24 rounded-lg overflow-hidden cursor-pointer group border border-border hover:border-accent/30 transition-colors"
                        onClick={() => onPhotoClick(photo, photos, i)}
                      >
                        <img
                          src={getImageUrl(photo.storageName)}
                          alt={photo.originalName}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function MemoriesPage({ addToast }) {
  const [timeline, setTimeline] = useState([]);
  const [onThisDay, setOnThisDay] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [timelineRes, otdRes] = await Promise.all([
          photoService.getTimeline({ limit: 100 }),
          photoService.getOnThisDay(),
        ]);
        setTimeline(timelineRes.data.timeline);
        setOnThisDay(otdRes.data.photos);
      } catch (e) {
        addToast?.('Failed to load memories', 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const now = new Date();

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-8 animate-pulse">
        <div className="h-8 bg-border rounded w-40" />
        <div className="h-32 skeleton rounded-xl" />
        {[1,2,3].map(i => (
          <div key={i} className="space-y-2">
            <div className="h-6 bg-border rounded w-48" />
            <div className="flex gap-2">
              {[1,2,3,4].map(j => <div key={j} className="w-32 h-24 skeleton rounded-lg flex-shrink-0" />)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className="p-6 md:p-8 space-y-8"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl font-bold text-text flex items-center gap-3">
          <Clock size={22} className="text-accent" />
          Memories
        </h1>
        <p className="text-sm text-muted mt-0.5">Your photographs, arranged by time.</p>
      </div>

      {/* On This Day */}
      {onThisDay.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 bg-accent rounded-full" />
            <h2 className="font-serif text-lg font-semibold text-text">On This Day</h2>
            <span className="text-xs text-muted px-2 py-0.5 rounded-full bg-accent/10 text-accent">
              {now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {onThisDay.map((photo, i) => (
              <div
                key={photo._id}
                className="relative flex-shrink-0 w-40 rounded-xl overflow-hidden cursor-pointer group border border-border hover:border-accent/30 transition-colors"
                onClick={() => setViewer({ photo, photos: onThisDay, index: i })}
              >
                <img
                  src={getImageUrl(photo.storageName)}
                  alt={photo.originalName}
                  className="w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="p-2 bg-card">
                  <p className="text-xs font-medium text-text truncate">{photo.originalName}</p>
                  <p className="text-xs text-muted">
                    {new Date(photo.dateToUse || photo.createdAt).getFullYear()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Timeline */}
      {timeline.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Clock size={36} className="text-border mb-3" />
          <p className="font-serif text-lg text-text mb-1">No memories yet</p>
          <p className="text-sm text-muted">Upload photographs to build your timeline.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {timeline.map((group) => (
            <TimelineMonth
              key={group.key}
              group={group}
              onPhotoClick={(photo, photos, i) => setViewer({ photo, photos, index: i })}
            />
          ))}
        </div>
      )}

      {/* Viewer */}
      {viewer && (
        <PhotoViewer
          photo={viewer.photo}
          photos={viewer.photos}
          currentIndex={viewer.index}
          onClose={() => setViewer(null)}
          onDelete={() => setViewer(null)}
          onUpdate={() => {}}
        />
      )}
    </motion.div>
  );
}
