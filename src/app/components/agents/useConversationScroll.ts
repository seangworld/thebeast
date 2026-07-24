"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { MutableRefObject, TouchEvent, WheelEvent } from "react";

type UseConversationScrollOptions = {
  conversationId: string;
  messageCount: number;
  streaming: boolean;
  followLatestSignal?: number;
  scrollPositions?: MutableRefObject<Map<string, number>>;
};

const latestThreshold = 48;

export function useConversationScroll({
  conversationId,
  messageCount,
  streaming,
  followLatestSignal,
  scrollPositions,
}: UseConversationScrollOptions) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const followingLatestRef = useRef(true);
  const programmaticScrollRef = useRef(false);
  const scrollFrameRef = useRef<number>();
  const touchStartYRef = useRef<number>();
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);

  const isAtLatest = useCallback((region: HTMLDivElement) => {
    return (
      region.scrollHeight - region.clientHeight - region.scrollTop <= latestThreshold
    );
  }, []);

  const scrollToLatest = useCallback(
    (behavior: ScrollBehavior) => {
      const region = scrollRef.current;
      if (!region) return;
      followingLatestRef.current = true;
      setShowJumpToLatest(false);
      programmaticScrollRef.current = true;
      region.scrollTo({ top: region.scrollHeight, behavior });
      scrollPositions?.current.set(conversationId, region.scrollTop);
    },
    [conversationId, scrollPositions]
  );

  useLayoutEffect(() => {
    const region = scrollRef.current;
    if (!region) return;
    const restoredPosition = scrollPositions?.current.get(conversationId);
    programmaticScrollRef.current = true;
    region.scrollTop = restoredPosition ?? region.scrollHeight;
    followingLatestRef.current =
      restoredPosition === undefined || isAtLatest(region);
    setShowJumpToLatest(!followingLatestRef.current);
    window.requestAnimationFrame(() => {
      programmaticScrollRef.current = false;
    });
  }, [conversationId, isAtLatest, scrollPositions]);

  useEffect(() => {
    if (followingLatestRef.current) scrollToLatest("smooth");
  }, [messageCount, scrollToLatest]);

  useEffect(() => {
    if (followLatestSignal === undefined) return;
    scrollToLatest("smooth");
  }, [followLatestSignal, scrollToLatest]);

  useEffect(() => {
    const content = contentRef.current;
    if (!content || !streaming || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (followingLatestRef.current) scrollToLatest("auto");
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [conversationId, scrollToLatest, streaming]);

  useEffect(
    () => () => {
      if (scrollFrameRef.current) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
    },
    []
  );

  const handleScroll = useCallback(() => {
    if (scrollFrameRef.current) return;
    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = undefined;
      const region = scrollRef.current;
      if (!region) return;
      const atLatest = isAtLatest(region);
      if (programmaticScrollRef.current) {
        if (atLatest) programmaticScrollRef.current = false;
        scrollPositions?.current.set(conversationId, region.scrollTop);
        return;
      }
      followingLatestRef.current = atLatest;
      setShowJumpToLatest(!atLatest);
      scrollPositions?.current.set(conversationId, region.scrollTop);
    });
  }, [conversationId, isAtLatest, scrollPositions]);

  const pauseFollowingLatest = useCallback(() => {
    programmaticScrollRef.current = false;
    followingLatestRef.current = false;
    setShowJumpToLatest(true);
  }, []);

  const handleWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      if (event.deltaY < 0) pauseFollowingLatest();
    },
    [pauseFollowingLatest]
  );

  const handleTouchStart = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      touchStartYRef.current = event.touches[0]?.clientY;
    },
    []
  );

  const handleTouchMove = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      const currentY = event.touches[0]?.clientY;
      if (
        currentY !== undefined &&
        touchStartYRef.current !== undefined &&
        currentY > touchStartYRef.current
      ) {
        pauseFollowingLatest();
      }
      touchStartYRef.current = currentY;
    },
    [pauseFollowingLatest]
  );

  return {
    contentRef,
    handleScroll,
    handleTouchMove,
    handleTouchStart,
    handleWheel,
    scrollRef,
    scrollToLatest,
    showJumpToLatest,
  };
}
