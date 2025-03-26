// EngravedText.tsx
import React, { useEffect, useState } from 'react';

interface EngravedTextProps {
    text: string;
    initialAngle?: number;
    showControls?: boolean;
    fontSize?: string;
    letterSpacing?: string;
    className?: string;
}

const EngravedText: React.FC<EngravedTextProps> = ({
                                                       text,
                                                       initialAngle = 250,
                                                       showControls = false,
                                                       fontSize = '48px',
                                                       letterSpacing = '5px',
                                                       className = ''
                                                   }) => {
    const [angle, setAngle] = useState(initialAngle);

    const calculateShadow = (angle: number) => {
        const rad = (angle * Math.PI) / 180;
        const lightX = Math.cos(rad);
        const lightY = Math.sin(rad);

        return `
      ${lightX * 2}px ${lightY * 2}px 1px black,
      ${lightX * 4}px ${lightY * 4}px 4px #ae6100,
      
      ${lightX * -1}px ${lightY * -1}px 0.5px white,
      ${lightX * -2}px ${lightY * -2}px 3px #ffce81,
      ${lightX * -3}px ${lightY * -3}px 10px #ffb33a,
      ${lightX * -9}px ${lightY * -9}px 30px #ff961a,
      ${lightX * 5}px ${lightY * 5}px 10px #ae6100,
      ${lightX * 2}px ${lightY * 2}px 15px #ae6100,
      
      0px 0px 50px rgba(255,128,0,0.9),
      0px 0px 100px rgba(255,128,0,0.9),
      0px 0px 200px rgba(255,128,0,0.9),
      
      0px 0px 1px rgba(255,20,0,1),
      0px 0px 3px rgba(255,20,0,1),
      0px 0px 5px rgba(255,20,0,1),
      0px 0px 7px rgba(255,20,0,1)
    `;
    };

    const textStyle = {
        filter: 'blur(0.5px)',
        fontSize: fontSize,
        fontWeight: 'bold',
        color: 'rgba(180,100,0,1)',
        letterSpacing: letterSpacing,
        textShadow: calculateShadow(angle),
        fontFamily: 'Arial, sans-serif',
        textAlign: 'center' as 'center',
        margin: '0 0 20px 0'
    };

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAngle(parseInt(e.target.value));
    };

    return (
        <div style={{ marginBottom: showControls ? '30px' : '10px' }}>
            {showControls && (
                <div style={{ marginBottom: '15px', textAlign: 'center' }}>
                    <input
                        type="range"
                        min="0"
                        max="360"
                        value={angle}
                        onChange={handleSliderChange}
                        style={{ width: '80%', maxWidth: '300px' }}
                    />
                </div>
            )}
            <h1
                className={`engraved-text ${className}`}
                style={textStyle}
            >
                {text}
            </h1>
        </div>
    );
};

export default EngravedText;