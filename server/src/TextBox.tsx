import { Flex, Box as FlexBox } from '@react-three/flex'
import { Text } from '@react-three/drei'
import { useRef, useState, useEffect, useLayoutEffect } from 'react'
interface TextBoxProps {
  text: string
  padding?: number
  fontSize?: number
}

export const TextBox: React.FC<TextBoxProps> = ({ text, padding = 12, fontSize = 48 }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const textRef = useRef<any>(null)
  const [dimensions, setDimensions] = useState({ width: 1, height: 1 })
  const [isTextReady, setIsTextReady] = useState(false)

  // Reset text ready state when text changes
  useEffect(() => {
    setIsTextReady(false)
  }, [text])

  useLayoutEffect(() => {
    if (textRef.current && isTextReady) {
      const bbox = textRef.current.geometry?.boundingBox
      if (bbox) {
        const width = Math.abs(bbox.max.x - bbox.min.x)
        const height = Math.abs(bbox.max.y - bbox.min.y)

        // Only update if we have valid, non-zero dimensions
        if (width > 0 && height > 0) {
          setDimensions({
            width: width + padding * 2,
            height: height + padding * 2,
          })
        }
      }
    }
  }, [text, padding, fontSize, isTextReady])

  return (
    <Flex
      size={[dimensions.width, dimensions.height, 0.1]}
      position={[0, 0, 0]}
      flexDirection="row"
      alignItems="center"
      justifyContent="center"
    >
      <FlexBox margin={padding} width="auto">
        <mesh>
          <boxGeometry args={[dimensions.width, dimensions.height, 0.1]} />
          <meshStandardMaterial color="#444444" />
        </mesh>

        <Text
          ref={textRef}
          position={[0, 0, 1]}
          fontSize={fontSize}
          color="white"
          onSync={() => {
            setIsTextReady(true)
          }}
        >
          {text}
        </Text>
      </FlexBox>
    </Flex>
  )
}
