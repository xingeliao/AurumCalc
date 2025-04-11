// SimpleGLSLBackground.tsx
import React, { useRef, useEffect } from "react";
import { Canvas } from "glsl-canvas-js";

// 片段着色器代码（与原来相同）
const fragmentShaderSource = `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 resolution;
uniform vec3 gyroscope;  // Gyroscope: x = pitch, y = yaw, z = roll
uniform sampler2D noise;  // Tiling noise texture
uniform vec3 orientation;
uniform vec3 gravity;
uniform vec3 magnetic;
uniform vec3 rotationVector;
uniform samplerCube noisecubep2;


uniform vec2 cameraAddent;
uniform mat2 cameraOrientation;
uniform sampler2D cameraFront;



vec3 goldColor = 0.8*normalize(vec3(1.0, 0.55, 0.1));



//const float margin = 100.0;   // Distancia desde los bordes de la pantalla
//const float borderSize = 50.0; // Grosor del borde con gradiente


// Spherical environment mapping
vec3 getReflection(vec3 normal) {
    normal = normalize(normal);
    vec2 uv = normal.xy * 0.5 + 0.5;  // Convert to UV space
    return texture2D(noise, uv).rgb;
}

// Beveled ingot shape
float ingotShape(vec2 uv) {
    uv = (uv - 0.3) * 2.0; // Centered
    float edge = 0.6 - length(uv) * 0.8; // Bevel softness
    return smoothstep(0.0, 0.05, edge);
}

float getborder(float margin, float borderSize, bool middle){
\t vec2 uvborder = gl_FragCoord.xy / resolution.xy;
   vec2 aspect = vec2(resolution.x / resolution.y, 1.0);

    // Calcular los límites del rectángulo
    vec2 minBox = margin / resolution;
    vec2 maxBox = 1.0 - minBox;
    float border = borderSize / resolution.x; // Mantener grosor uniforme

    // Distancia a los bordes
    float distLeft   = smoothstep(minBox.x, minBox.x + border, uvborder.x);
    float distRight  = smoothstep(maxBox.x, maxBox.x - border, uvborder.x);
    float distBottom = smoothstep(minBox.y, minBox.y + border, uvborder.y);
    float distTop    = smoothstep(maxBox.y, maxBox.y - border, uvborder.y);

    // Combinar bordes para formar el marco con gradiente
    float edgeX = distLeft * (1.0 - distRight) + distRight * (1.0 - distLeft);
    float edgeY = distBottom * (1.0 - distTop) + distTop * (1.0 - distBottom);
    border = max(edgeX, edgeY);
    if (middle==true){
       border = clamp(1.-abs(2.*(border-.5)),0.,1.);
       return border;
    } else {
       border = clamp(1.-abs(1.*(border)),0.,1.);
       return border;
    }
\t}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    uv = (uv - 0.5) * vec2(resolution.x / resolution.y, 1.0); // Keep proportions

    // Simulated normal with gyroscope influence
    vec3 normal = normalize(vec3(uv, 1.0));

    //edgessss
    vec2 edges = 2. * vec2(length(uv.x), length(uv.y));
   // edges *=  vec2(resolution.x / resolution.y, 1.0);
    edges = (vec2(1.5, 7.0)*(1. - edges));
    edges = clamp(edges, 0., 1.);
    edges = 1. - edges;
    //edges = edges*edges;
    smoothstep(0.0, 1.0, edges);
    edges *= sign(uv - 0.);

    //normal.xy += gravity.xy * 0.5;
    normal.xy += gravity.xy * -.15;  // Pan reflection with gyro
    normal.xy += edges * 1.5;
    normal.xy += 0.05* texture2D(noise, (vec2(abs(edges.y), abs(-edges.x)) * 0.5+uv) * vec2(.0,55.)).rr;
    normal.xy += 0.05* texture2D(noise, uv * 1.5).rr;

    // Get reflection from noise texture
    vec3 reflection = getReflection(reflect(vec3(0, 0, 1), normal));

    reflection = getReflection(reflect(vec3(0, 0, 1), normal));
    //reflection*= reflection*1.5;

    // Bevel shading
    float bevel = clamp(15.*abs(length(edges)),0.,1.);
    //float border = clamp(1.-(abs(1.-(40.*(1.-max(abs(uv.x -.8), abs(uv.y -.55)))))),0.,1.);
    // border = clamp(1.-(abs(1.-(40.(1.-max(abs(5.5*abs(1.(uv.x -.0))), abs(uv.y -.55)))))),0.,1.);

   float border = getborder (100.,50., true);

    vec3 color = mix(goldColor * 0.5, goldColor * 0.6, bevel+(border*border*5.* 4.*(reflection-.4))) * reflection * 5.;


    vec2 uvcam = gl_FragCoord.xy / resolution.xy;
\t  uvcam = vec2(1. - uvcam.x, uvcam.y);
\t  vec2 st = cameraAddent + uvcam * cameraOrientation;
\t  st += vec2(abs(edges.x), -edges.y) * 0.5;
\t  st += 0.01* texture2D(noise, uv * 1.5).rr;
\t  st += -0.02* texture2D(noise, (vec2(abs(edges.y), abs(-edges.x)) * 0.5+uv) * vec2(.0,55.)).rr;
    vec3 camcol = texture2D(cameraFront, st).rgb;
    //camcol *= camcol;
    camcol *= 1.5;
    color = mix(color, color*camcol, 0.0);
    //color = vec3(edges, 0.);
    //color = vec3(border, .0, .0);

    color = mix(color, vec3(1.,1.,1.),0.75*clamp(length(color)*length(color)*length(color)*0.1,0.,1.));

    float dark = getborder(0.,100., false);
    color*= 1.-(.75*(1.-dark)*(1.-dark));
    color += vec3(0.,.05,0.);

    gl_FragColor = vec4(color, 1.0);
    //gl_FragColor = vec4(edges, 0.0, 1.0);
    //gl_FragColor = vec4(texture2D(noise, uv).rgb, 1.0); // 纯红色，测试vec4错误

}
`;

interface SimpleGLSLBackgroundProps {
    children?: React.ReactNode;
}

const SimpleGLSLBackground: React.FC<SimpleGLSLBackgroundProps> = ({ children }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const glslCanvasRef = useRef<any>(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        // 设置初始canvas尺寸
        const canvas = canvasRef.current;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // 调整canvas尺寸的函数
        const resizeCanvas = () => {
            if (!canvasRef.current) return;

            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            // 如果GlslCanvas已经初始化，更新其分辨率
            if (glslCanvasRef.current) {
                glslCanvasRef.current.setUniform("resolution", window.innerWidth, window.innerHeight);
            }
        };

        try {
            // 初始化GlslCanvas
            const options = {
                fragmentString: fragmentShaderSource,
                alpha: true,
                antialias: true,
                onError: (error: any) => console.error("GLSL错误:", error)
            };
            const sandbox = new Canvas(canvasRef.current, options);
            glslCanvasRef.current = sandbox;

            sandbox.setUniform("resolution", window.innerWidth, window.innerHeight);

            // **加载 noise 纹理**
            const noiseTexture = new Image();
            noiseTexture.src = "/textures/noise.jpeg";
            noiseTexture.onload = () => {
                glslCanvasRef.current.setUniform("noise", noiseTexture);
                console.log("Noise 纹理加载成功");
            };
            noiseTexture.onerror = () => console.error("Noise 纹理加载失败");

            sandbox.setUniform("noise", noiseTexture);
            sandbox.setUniform("noiseTextureType", 0); // 0 代表 2D 纹理

            // 强制开始渲染
            sandbox.play();
            console.log("GlslCanvas 初始化成功");
            console.log("Canvas尺寸:", canvasRef.current.width, "x", canvasRef.current.height);
            console.log("是否支持WebGL:", !!canvasRef.current.getContext('webgl') || !!canvasRef.current.getContext('experimental-webgl'));

        } catch (error) {
            console.error("GlslCanvas 初始化错误:", error);
        }

        // 添加窗口大小变化监听器
        window.addEventListener("resize", resizeCanvas);


        let startTime = Date.now();

        const update = () => {
            if (glslCanvasRef.current) {
                let elapsed = (Date.now() - startTime) / 1000; // 计算运行的时间（秒）
                glslCanvasRef.current.setUniform("time", elapsed);
                requestAnimationFrame(update);
            }
        };
        update();

        // 清理函数
        return () => {
            window.removeEventListener("resize", resizeCanvas);

            // 停止渲染
            if (glslCanvasRef.current) {
                glslCanvasRef.current.pause();
            }
            glslCanvasRef.current = null;
        };
    }, []);

    return (
        <>
            <canvas
                ref={canvasRef}
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    zIndex: -1,
                }}
            />
            {children}
        </>
    );
};

export default SimpleGLSLBackground;