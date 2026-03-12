import { useState, useRef, useCallback, useEffect } from 'react';
import { getRotationFromMatrix } from '../utilities/cardHelpers.jsx';

export function useCardModal(hit) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const imgRef = useRef(null);
  const wrapperRef = useRef(null);
  const timeoutRef = useRef(null);

  // Clean up any pending timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleImageClick = useCallback((e) => {
    if (hit.image_large || hit.image_small) {
      const imgElement = e.target.tagName === 'IMG' ? e.target : e.target.querySelector('img');
      if (!imgElement) return;

      const rect = imgElement.getBoundingClientRect();
      const currentRotation = getRotationFromMatrix(wrapperRef.current);

      setOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      setRotation(currentRotation);
      setIsModalOpen(true);
      setIsClosing(false);
    }
  }, [hit.image_large, hit.image_small]);

  const handleCloseModal = useCallback(() => {
    if (wrapperRef.current) {
      setRotation(getRotationFromMatrix(wrapperRef.current));
    }
    setIsClosing(true);
    timeoutRef.current = setTimeout(() => {
      setIsModalOpen(false);
      setIsClosing(false);
    }, 250);
  }, []);

  return { isModalOpen, isClosing, origin, rotation, imgRef, wrapperRef, handleImageClick, handleCloseModal };
}
