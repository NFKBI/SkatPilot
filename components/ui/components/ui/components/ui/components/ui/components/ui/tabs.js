import React, { useState } from "react"

export function Tabs({ defaultValue, children }) {
  const [value, setValue] = useState(defaultValue)
  const tabs = React.Children.toArray(children)
  const list = tabs.find((child) => child.type.displayName === "TabsList")
  const contents = tabs.filter((child) => child.type.displayName === "TabsContent")

  return (
    <div>
      {React.cloneElement(list, { value, setValue })}
      {contents.map((child) =>
        React.cloneElement(child, { value, key: child.props.value })
      )}
    </div>
  )
}

export function TabsList({ children, value, setValue, className }) {
  return (
    <div className={`flex gap-2 ${className || ""}`}>
      {React.Children.map(children, (child) =>
        React.cloneElement(child, { activeValue: value, setValue })
      )}
    </div>
  )
}
TabsList.displayName = "TabsList"

export function TabsTrigger({ value, setValue, activeValue, children }) {
  const isActive = value === activeValue
  return (
    <button
      onClick={() => setValue(value)}
      className={`px-4 py-2 rounded-lg border ${
        isActive ? "bg-blue-600 text-white" : "bg-white text-black"
      }`}
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, children, className, ...props }) {
  return (
    <div className={className} hidden={props.value !== value}>
      {props.value === value && children}
    </div>
  )
}
TabsContent.displayName = "TabsContent"
