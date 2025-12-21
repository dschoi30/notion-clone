import { useState, useRef, useCallback, useEffect, ReactNode } from "react"
import { cn } from "@/lib/utils"

interface TooltipProps {
  children: ReactNode;
  content?: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
  delayDuration?: number;
  xOffset?: number;
  [key: string]: unknown;
}

const Tooltip = ({ children, content, side = "top", className, delayDuration = 700, xOffset = 0, ...props }: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const triggerRef = useRef<HTMLDivElement | null>(null)

  const showTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        let x: number, y: number
        const offset = 8 // 툴팁과 요소 사이의 간격
        
        switch (side) {
          case "top":
            x = rect.left + rect.width / 2
            y = rect.top - offset
            break
          case "bottom":
            x = rect.left + rect.width / 2
            y = rect.bottom + offset
            break
          case "left":
            x = rect.left - offset
            y = rect.top + rect.height / 2
            break
          case "right":
            x = rect.right + offset
            y = rect.top + rect.height / 2
            break
          default:
            x = rect.left + rect.width / 2
            y = rect.top - offset
        }
        
        // X 좌표 오프셋 적용
        x = x + xOffset
        
        setPosition({ x, y })
        setIsVisible(true)
      }
    }, delayDuration)
  }, [delayDuration, side, xOffset])

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }, [])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleMouseEnter = useCallback(() => {
    showTooltip()
  }, [showTooltip])

  const handleMouseLeave = useCallback(() => {
    hideTooltip()
  }, [hideTooltip])

  const getTransformOrigin = (): string => {
    switch (side) {
      case "top": return "center bottom"
      case "bottom": return "center top"
      case "left": return "right center"
      case "right": return "left center"
      default: return "center bottom"
    }
  }

  const getTransform = (): string => {
    switch (side) {
      case "top": 
      case "bottom": 
        return "translateX(-50%)"
      case "left": 
        return "translate(-100%, -50%)"
      case "right": 
        return "translateY(-50%)"
      default: 
        return "translateX(-50%)"
    }
  }

  if (!content) {
    return <>{children}</>
  }

  return (
    <div className="inline-block relative">
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-block w-100 h-100"
      >
        {children}
      </div>
      {isVisible && (
        <div
          className={cn(
            "fixed z-50 px-2 py-1 text-xs text-white rounded shadow-lg pointer-events-none",
            "transition-opacity duration-150",
            className
          )}
          style={{
            left: position.x,
            top: position.y,
            transform: getTransform(),
            transformOrigin: getTransformOrigin(),
            backgroundColor: '#2C2C2B',
          }}
          {...props}
        >
          {content}
        </div>
      )}
    </div>
  )
}

export { Tooltip }

