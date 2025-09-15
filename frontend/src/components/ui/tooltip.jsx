import * as React from "react"
import { cn } from "@/lib/utils"

const Tooltip = ({ children, content, side = "top", className, delayDuration = 700, ...props }) => {
  const [isVisible, setIsVisible] = React.useState(false)
  const [position, setPosition] = React.useState({ x: 0, y: 0 })
  const timeoutRef = React.useRef(null)
  const triggerRef = React.useRef(null)

  const showTooltip = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        
        let x, y
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
        
        setPosition({ x, y })
        setIsVisible(true)
      }
    }, delayDuration)
  }, [delayDuration, side])

  const hideTooltip = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }, [])

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleMouseEnter = React.useCallback(() => {
    showTooltip()
  }, [showTooltip])

  const handleMouseLeave = React.useCallback(() => {
    hideTooltip()
  }, [hideTooltip])

  const getTransformOrigin = () => {
    switch (side) {
      case "top": return "center bottom"
      case "bottom": return "center top"
      case "left": return "right center"
      case "right": return "left center"
      default: return "center bottom"
    }
  }

  const getTransform = () => {
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
    return children
  }

  return (
    <div className="inline-block relative">
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="cursor-default"
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
