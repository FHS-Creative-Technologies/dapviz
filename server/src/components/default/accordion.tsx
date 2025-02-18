import { ReactNode, RefAttributes, createContext, forwardRef, useContext, useState } from 'react'
import { ContainerRef, Container, ContainerProperties } from '@react-three/uikit'
import { ChevronDown } from '@react-three/uikit-lucide'

const AccordionContext = createContext<[string | undefined, (value: string | undefined) => void]>(null!)

export type AccordionProperties = ContainerProperties

export function Accordion({ children, ...props }: AccordionProperties) {
  const stateHandler = useState<string | undefined>(undefined)
  return (
    <Container flexDirection="column" {...props}>
      <AccordionContext.Provider value={stateHandler}>{children}</AccordionContext.Provider>
    </Container>
  )
}

const AccordionItemContext = createContext<string>('')

export type AccordionItemProperties = ContainerProperties & { value: string }

export const AccordionItem: (props: RefAttributes<ContainerRef> & AccordionItemProperties) => ReactNode = forwardRef(
  ({ children, ...props }, ref) => {
    return (
      <Container
        cursor="pointer"
        flexDirection="column"
        ref={ref}
        {...props}
      >
        <AccordionItemContext.Provider value={props.value}>{children}</AccordionItemContext.Provider>
      </Container>
    )
  },
)

export type AccordionTriggerProperties = ContainerProperties

export const AccordionTrigger: (props: RefAttributes<ContainerRef> & AccordionTriggerProperties) => ReactNode =
  forwardRef(({ children, ...props }, ref) => {
    const itemValue = useContext(AccordionItemContext)
    const [value, setValue] = useContext(AccordionContext)
    const isSelected = itemValue === value
    return (
      <Container
        flexDirection="row"
        flexGrow={1}
        flexShrink={1}
        alignItems="center"
        justifyContent="space-between"
        paddingY={16}
        ref={ref}
        onClick={() => setValue(isSelected ? undefined : itemValue)}
        {...props}
      >
        {children}
        <ChevronDown transformRotateZ={isSelected ? 180 : 0} width={16} height={16} flexShrink={0} color="white" />
      </Container>
    )
  })

export type AccordionContentProperties = ContainerProperties

export const AccordionContent: (props: RefAttributes<ContainerRef> & AccordionContentProperties) => ReactNode =
  forwardRef(({ children, ...props }, ref) => {
    const itemValue = useContext(AccordionItemContext)
    const [value] = useContext(AccordionContext)
    if (value != itemValue) {
      return null
    }
    return (
      <Container overflow="hidden" ref={ref} {...props}>
        {children}
      </Container>
    )
  })
