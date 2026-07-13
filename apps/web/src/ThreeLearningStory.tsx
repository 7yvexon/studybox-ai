import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

type ThreeLearningStoryProps = {
  onStart: () => void;
};

const MODE_CARDS = [
  ["01", "개념 설명", "낯선 개념을 익숙한 말로"],
  ["02", "문제 풀이", "조건부터 정답 확인까지"],
  ["03", "핵심 요약", "기억할 정보만 선명하게"],
  ["04", "시험 대비", "빈출 개념과 실수를 함께"],
  ["05", "수행평가", "근거가 보이는 발표 구조로"]
] as const;

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const mix = (from: number, to: number, progress: number) => from + (to - from) * progress;
const smoothstep = (start: number, end: number, value: number) => {
  const progress = clamp((value - start) / Math.max(0.0001, end - start));
  return progress * progress * (3 - 2 * progress);
};

const roundedRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
};

const createCanvasTexture = (
  width: number,
  height: number,
  draw: (context: CanvasRenderingContext2D) => void
) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas 2D context is unavailable.");
  }

  context.textBaseline = "middle";
  draw(context);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
};

const drawBrand = (context: CanvasRenderingContext2D, x: number, y: number, size = 28) => {
  context.save();
  context.strokeStyle = "#315dff";
  context.lineWidth = Math.max(3, size * 0.12);
  roundedRect(context, x, y - size * 0.42, size * 0.88, size * 0.68, size * 0.2);
  context.stroke();
  roundedRect(context, x + size * 0.34, y - size * 0.24, size * 0.88, size * 0.68, size * 0.2);
  context.stroke();
  context.restore();
};

const drawQuestionTexture = () => createCanvasTexture(1400, 860, (context) => {
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, 1400, 860);

  context.fillStyle = "#f7f9fd";
  context.fillRect(0, 0, 1400, 112);
  context.strokeStyle = "#dce3ef";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(0, 111);
  context.lineTo(1400, 111);
  context.stroke();

  drawBrand(context, 54, 56, 34);
  context.fillStyle = "#121826";
  context.font = "700 31px Inter, 'Noto Sans KR', sans-serif";
  context.fillText("StudyBox", 106, 58);
  context.fillStyle = "#315dff";
  context.fillText("AI", 264, 58);
  context.fillStyle = "#68758a";
  context.font = "600 22px Inter, 'Noto Sans KR', sans-serif";
  context.fillText("개념 설명 · 중학교 2학년", 1010, 58);

  context.fillStyle = "#f2f5fa";
  roundedRect(context, 46, 150, 1308, 112, 18);
  context.fill();
  context.fillStyle = "#647086";
  context.font = "700 23px Inter, 'Noto Sans KR', sans-serif";
  context.fillText("나", 78, 206);
  context.fillStyle = "#202735";
  context.font = "650 30px Inter, 'Noto Sans KR', sans-serif";
  context.fillText("왜 음수끼리 곱하면 양수가 돼?", 150, 206);

  context.fillStyle = "#e8eeff";
  context.beginPath();
  context.arc(84, 334, 38, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#315dff";
  context.font = "800 22px Inter, sans-serif";
  context.fillText("AI", 67, 336);

  context.fillStyle = "#315dff";
  context.font = "750 22px Inter, 'Noto Sans KR', sans-serif";
  context.fillText("부호의 변화부터 차근차근", 150, 310);
  context.fillStyle = "#111827";
  context.font = "760 50px Inter, 'Noto Sans KR', sans-serif";
  context.fillText("방향을 두 번 바꾸면,", 150, 386);
  context.fillText("다시 원래 방향이 됩니다.", 150, 448);
  context.fillStyle = "#667289";
  context.font = "500 25px Inter, 'Noto Sans KR', sans-serif";
  context.fillText("수직선에서 음수로 곱한다는 것은 방향을 뒤집는다는 뜻이에요.", 150, 522);

  context.fillStyle = "#f6f8fc";
  roundedRect(context, 150, 574, 568, 104, 14);
  context.fill();
  context.fillStyle = "#1c2433";
  context.font = "760 35px Inter, sans-serif";
  context.fillText("− × − = +", 184, 626);
  context.fillStyle = "#7b879a";
  context.font = "600 22px Inter, 'Noto Sans KR', sans-serif";
  context.fillText("방향을 두 번 전환", 466, 626);

  context.strokeStyle = "#d9e1ee";
  roundedRect(context, 46, 734, 1308, 82, 16);
  context.stroke();
  context.fillStyle = "#8a95a8";
  context.font = "500 22px Inter, 'Noto Sans KR', sans-serif";
  context.fillText("이어서 질문해 보세요", 80, 776);
  context.fillStyle = "#315dff";
  context.beginPath();
  context.arc(1308, 775, 28, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#ffffff";
  context.font = "700 28px Inter, sans-serif";
  context.fillText("↑", 1299, 775);
});

const drawModeTexture = (number: string, title: string, description: string) =>
  createCanvasTexture(760, 460, (context) => {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, 760, 460);
    context.fillStyle = "#315dff";
    context.fillRect(0, 0, 12, 460);
    context.fillStyle = "#9aacd4";
    context.font = "700 42px Inter, sans-serif";
    context.fillText(number, 60, 70);
    context.fillStyle = "#111827";
    context.font = "760 64px Inter, 'Noto Sans KR', sans-serif";
    context.fillText(title, 58, 178);
    context.fillStyle = "#68758a";
    context.font = "500 30px Inter, 'Noto Sans KR', sans-serif";
    context.fillText(description, 58, 252);
    context.fillStyle = "#edf2ff";
    roundedRect(context, 58, 328, 252, 56, 10);
    context.fill();
    context.fillStyle = "#315dff";
    context.font = "700 24px Inter, 'Noto Sans KR', sans-serif";
    context.fillText("맞춤 답변 구조", 84, 357);
  });

const drawWordmarkTexture = () => createCanvasTexture(1900, 360, (context) => {
  context.clearRect(0, 0, 1900, 360);
  context.textAlign = "center";
  context.fillStyle = "#111827";
  context.font = "760 230px Inter, 'Noto Sans KR', sans-serif";
  context.fillText("StudyBox", 820, 190);
  context.fillStyle = "#315dff";
  context.fillText("AI", 1540, 190);
  context.textAlign = "left";
});

const drawWorkspaceTexture = () => createCanvasTexture(1800, 1080, (context) => {
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, 1800, 1080);
  context.fillStyle = "#f0f4fb";
  context.fillRect(0, 0, 360, 1080);
  context.fillStyle = "#fbfcfe";
  context.fillRect(360, 0, 1440, 104);
  context.strokeStyle = "#dbe3ef";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(360, 104);
  context.lineTo(1800, 104);
  context.moveTo(360, 0);
  context.lineTo(360, 1080);
  context.stroke();

  drawBrand(context, 52, 62, 32);
  context.fillStyle = "#111827";
  context.font = "730 29px Inter, 'Noto Sans KR', sans-serif";
  context.fillText("StudyBox", 104, 64);
  context.fillStyle = "#315dff";
  context.fillText("AI", 252, 64);

  context.fillStyle = "#ffffff";
  context.strokeStyle = "#ced8e8";
  roundedRect(context, 38, 136, 284, 70, 12);
  context.fill();
  context.stroke();
  context.fillStyle = "#253047";
  context.font = "650 25px Inter, 'Noto Sans KR', sans-serif";
  context.fillText("＋ 새 학습", 64, 172);

  const history = ["일차함수 그래프", "광합성 핵심 정리", "영어 수행평가", "조선 후기 흐름"];
  history.forEach((label, index) => {
    if (index === 0) {
      context.fillStyle = "#dfe7ff";
      roundedRect(context, 38, 246 + index * 78, 284, 58, 10);
      context.fill();
    }
    context.fillStyle = index === 0 ? "#264dde" : "#6d788c";
    context.font = `${index === 0 ? 700 : 560} 22px Inter, 'Noto Sans KR', sans-serif`;
    context.fillText(label, 62, 276 + index * 78);
  });

  context.fillStyle = "#111827";
  context.font = "700 27px Inter, 'Noto Sans KR', sans-serif";
  context.fillText("새 학습 대화", 410, 53);
  ["개념 설명", "중학교 2학년", "보통 길이"].forEach((label, index) => {
    const x = 1270 + index * 158;
    context.fillStyle = "#f5f7fb";
    context.strokeStyle = "#d9e1ed";
    roundedRect(context, x, 26, 138, 54, 9);
    context.fill();
    context.stroke();
    context.fillStyle = "#647086";
    context.font = "620 18px Inter, 'Noto Sans KR', sans-serif";
    context.fillText(label, x + 20, 54);
  });

  context.fillStyle = "#f1f4f9";
  roundedRect(context, 410, 158, 1290, 92, 14);
  context.fill();
  context.fillStyle = "#242d3e";
  context.font = "650 25px Inter, 'Noto Sans KR', sans-serif";
  context.fillText("왜 음수끼리 곱하면 양수가 되는지 예시로 알려줘", 454, 204);

  context.fillStyle = "#e8eeff";
  context.beginPath();
  context.arc(450, 338, 34, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#315dff";
  context.font = "800 20px Inter, sans-serif";
  context.fillText("AI", 433, 340);
  context.fillStyle = "#315dff";
  context.font = "720 20px Inter, 'Noto Sans KR', sans-serif";
  context.fillText("개념 설명 · 이해부터 확인까지", 512, 310);
  context.fillStyle = "#111827";
  context.font = "760 43px Inter, 'Noto Sans KR', sans-serif";
  context.fillText("방향을 두 번 바꾸면", 512, 382);
  context.fillText("다시 원래 방향이 됩니다.", 512, 438);
  context.fillStyle = "#68758a";
  context.font = "500 24px Inter, 'Noto Sans KR', sans-serif";
  context.fillText("수직선과 온도 변화를 연결해서 생각해 볼게요.", 512, 500);

  [
    ["01", "방향", "음수는 반대 방향을 뜻해요."],
    ["02", "한 번 더", "다시 반대로 바꾸면 원래 방향이에요."],
    ["03", "확인", "그래서 음수 × 음수는 양수예요."]
  ].forEach(([number, title, body], index) => {
    const y = 574 + index * 112;
    context.strokeStyle = "#dfe5ef";
    context.beginPath();
    context.moveTo(512, y - 38);
    context.lineTo(1660, y - 38);
    context.stroke();
    context.fillStyle = "#99a6ba";
    context.font = "700 18px Inter, sans-serif";
    context.fillText(number, 512, y);
    context.fillStyle = "#273044";
    context.font = "700 23px Inter, 'Noto Sans KR', sans-serif";
    context.fillText(title, 592, y - 10);
    context.fillStyle = "#6b768a";
    context.font = "500 20px Inter, 'Noto Sans KR', sans-serif";
    context.fillText(body, 592, y + 26);
  });

  context.fillStyle = "#ffffff";
  context.strokeStyle = "#ccd7e8";
  roundedRect(context, 410, 952, 1290, 78, 14);
  context.fill();
  context.stroke();
  context.fillStyle = "#96a1b3";
  context.font = "500 21px Inter, 'Noto Sans KR', sans-serif";
  context.fillText("이어서 질문해 보세요", 448, 992);
  context.fillStyle = "#315dff";
  context.beginPath();
  context.arc(1654, 991, 28, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#ffffff";
  context.font = "700 27px Inter, sans-serif";
  context.fillText("↑", 1645, 991);
});

const setGroupOpacity = (group: THREE.Object3D, opacity: number) => {
  const safeOpacity = clamp(opacity);
  group.visible = safeOpacity > 0.004;
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) {
      return;
    }

    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      material.transparent = true;
      material.opacity = safeOpacity;
      material.depthWrite = safeOpacity > 0.92;
    });
  });
};

const setVectorFromKeyframes = (
  target: THREE.Vector3,
  keyframes: readonly THREE.Vector3[],
  progress: number
) => {
  const scaledProgress = clamp(progress) * (keyframes.length - 1);
  const index = Math.min(keyframes.length - 2, Math.floor(scaledProgress));
  const localProgress = smoothstep(0, 1, scaledProgress - index);
  target.lerpVectors(keyframes[index], keyframes[index + 1], localProgress);
};

export const ThreeLearningStory = ({ onStart }: ThreeLearningStoryProps) => {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;

    if (!section || !canvas || navigator.userAgent.includes("jsdom")) {
      return;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance"
      });
    } catch {
      section.dataset.threeReady = "fallback";
      section.classList.add("three-story--fallback");
      return;
    }

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xf7f9fc, 21, 46);
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
    const world = new THREE.Group();
    scene.add(world);

    renderer.setClearColor(0xf7f9fc, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.96;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const ambient = new THREE.HemisphereLight(0xffffff, 0xb8c7e5, 1.65);
    scene.add(ambient);
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(-5, 8, 10);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 36;
    keyLight.shadow.camera.left = -12;
    keyLight.shadow.camera.right = 12;
    keyLight.shadow.camera.top = 10;
    keyLight.shadow.camera.bottom = -10;
    scene.add(keyLight);
    const blueLight = new THREE.PointLight(0x315dff, 13, 18, 2);
    blueLight.position.set(5, -2, 4);
    scene.add(blueLight);

    const textures: THREE.Texture[] = [];
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const rememberTexture = <T extends THREE.Texture>(texture: T) => {
      textures.push(texture);
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      return texture;
    };
    const rememberGeometry = <T extends THREE.BufferGeometry>(geometry: T) => {
      geometries.push(geometry);
      return geometry;
    };
    const rememberMaterial = <T extends THREE.Material>(material: T) => {
      materials.push(material);
      return material;
    };

    const questionGroup = new THREE.Group();
    const questionShell = new THREE.Mesh(
      rememberGeometry(new RoundedBoxGeometry(6.7, 4.18, 0.24, 5, 0.15)),
      rememberMaterial(new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.42,
        metalness: 0.04
      }))
    );
    questionShell.castShadow = true;
    questionShell.receiveShadow = true;
    const questionTexture = rememberTexture(drawQuestionTexture());
    const questionFace = new THREE.Mesh(
      rememberGeometry(new THREE.PlaneGeometry(6.48, 3.98)),
      rememberMaterial(new THREE.MeshBasicMaterial({ map: questionTexture, transparent: true, toneMapped: false }))
    );
    questionFace.position.z = 0.128;
    questionGroup.add(questionShell, questionFace);
    world.add(questionGroup);

    const pageGroup = new THREE.Group();
    const pageMeshes: THREE.Mesh[] = [];
    for (let index = 0; index < 10; index += 1) {
      const page = new THREE.Mesh(
        rememberGeometry(new RoundedBoxGeometry(5.05, 3.18, 0.08, 3, 0.08)),
        rememberMaterial(new THREE.MeshStandardMaterial({
          color: index % 4 === 0 ? 0xcbd8ff : index % 2 === 0 ? 0xe4eafb : 0xf8faff,
          roughness: 0.58,
          metalness: 0.01,
          transparent: true
        }))
      );
      page.castShadow = index < 5;
      page.receiveShadow = true;
      pageGroup.add(page);
      pageMeshes.push(page);
    }
    world.add(pageGroup);

    const modeGroups = MODE_CARDS.map(([number, title, description], cardIndex) => {
      const group = new THREE.Group();
      const shell = new THREE.Mesh(
        rememberGeometry(new RoundedBoxGeometry(2.42, 1.48, 0.12, 4, 0.1)),
        rememberMaterial(new THREE.MeshStandardMaterial({
          color: cardIndex === 2 ? 0x315dff : 0xaec0ff,
          roughness: 0.4,
          metalness: 0.03,
          transparent: true
        }))
      );
      shell.castShadow = true;
      const texture = rememberTexture(drawModeTexture(number, title, description));
      const face = new THREE.Mesh(
        rememberGeometry(new THREE.PlaneGeometry(2.28, 1.36)),
        rememberMaterial(new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false }))
      );
      face.position.z = 0.065;
      group.add(shell, face);
      world.add(group);
      return group;
    });

    const wordmarkGroup = new THREE.Group();
    const wordmarkTexture = rememberTexture(drawWordmarkTexture());
    const wordmark = new THREE.Mesh(
      rememberGeometry(new THREE.PlaneGeometry(9.5, 1.8)),
      rememberMaterial(new THREE.MeshBasicMaterial({
        map: wordmarkTexture,
        transparent: true,
        depthWrite: false,
        toneMapped: false
      }))
    );
    wordmarkGroup.add(wordmark);
    world.add(wordmarkGroup);

    const workspaceGroup = new THREE.Group();
    const workspaceShell = new THREE.Mesh(
      rememberGeometry(new RoundedBoxGeometry(9.35, 5.62, 0.3, 5, 0.16)),
      rememberMaterial(new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.38,
        metalness: 0.05,
        transparent: true
      }))
    );
    workspaceShell.castShadow = true;
    workspaceShell.receiveShadow = true;
    const workspaceTexture = rememberTexture(drawWorkspaceTexture());
    const workspaceFace = new THREE.Mesh(
      rememberGeometry(new THREE.PlaneGeometry(9.1, 5.4)),
      rememberMaterial(new THREE.MeshBasicMaterial({ map: workspaceTexture, transparent: true, toneMapped: false }))
    );
    workspaceFace.position.z = 0.16;
    const workspaceAccent = new THREE.Mesh(
      rememberGeometry(new RoundedBoxGeometry(1.9, 5.24, 0.12, 4, 0.1)),
      rememberMaterial(new THREE.MeshPhysicalMaterial({
        color: 0x6f91ff,
        transparent: true,
        opacity: 0.12,
        roughness: 0.25,
        metalness: 0.08,
        transmission: 0.18
      }))
    );
    workspaceAccent.position.set(-3.56, 0, 0.26);
    workspaceGroup.add(workspaceShell, workspaceFace, workspaceAccent);
    world.add(workspaceGroup);

    const pathGroup = new THREE.Group();
    const pathDefinitions = [
      { color: 0x315dff, opacity: 0.72, radius: 0.055, y: -1.2, z: -5.2 },
      { color: 0x8eabff, opacity: 0.34, radius: 0.032, y: 1.1, z: -6.4 },
      { color: 0xc6d4ff, opacity: 0.48, radius: 0.026, y: 2.6, z: -7.2 }
    ];
    pathDefinitions.forEach((definition, pathIndex) => {
      const points: THREE.Vector3[] = [];
      for (let index = 0; index < 9; index += 1) {
        const x = -11 + index * 2.75;
        points.push(new THREE.Vector3(
          x,
          definition.y + Math.sin(index * 0.92 + pathIndex) * 1.15,
          definition.z + Math.cos(index * 0.72 + pathIndex) * 0.72
        ));
      }
      const curve = new THREE.CatmullRomCurve3(points);
      const tube = new THREE.Mesh(
        rememberGeometry(new THREE.TubeGeometry(curve, 180, definition.radius, 8, false)),
        rememberMaterial(new THREE.MeshPhysicalMaterial({
          color: definition.color,
          emissive: definition.color,
          emissiveIntensity: pathIndex === 0 ? 0.18 : 0.08,
          transparent: true,
          opacity: definition.opacity,
          roughness: 0.24,
          metalness: 0.1
        }))
      );
      pathGroup.add(tube);
    });
    world.add(pathGroup);

    const grid = new THREE.GridHelper(34, 34, 0x8ba7ff, 0xd8e2f3);
    const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
    gridMaterials.forEach((material) => {
      material.transparent = true;
      material.opacity = 0.22;
      materials.push(material);
    });
    grid.rotation.x = Math.PI / 2;
    grid.position.set(0, -0.1, -9.2);
    world.add(grid);

    const floor = new THREE.Mesh(
      rememberGeometry(new THREE.PlaneGeometry(32, 20)),
      rememberMaterial(new THREE.ShadowMaterial({ color: 0x315dff, opacity: 0.075 }))
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -4.2;
    floor.receiveShadow = true;
    world.add(floor);

    const cameraPositions = [
      new THREE.Vector3(0.6, 0.25, 8.8),
      new THREE.Vector3(2.2, 1.5, 14.8),
      new THREE.Vector3(-4.8, 3.4, 17.2),
      new THREE.Vector3(3.5, 4.7, 16.6),
      new THREE.Vector3(0.6, 0.45, 14.7)
    ];
    const cameraTargets = [
      new THREE.Vector3(1.8, 0, 0),
      new THREE.Vector3(0.4, 0, -1.3),
      new THREE.Vector3(0, 0.15, -2.5),
      new THREE.Vector3(0, -0.1, -3.1),
      new THREE.Vector3(1.55, 0, -3.1)
    ];
    const mobileCameraPositions = [
      new THREE.Vector3(0, 0.2, 14.2),
      new THREE.Vector3(1.4, 1.4, 19.6),
      new THREE.Vector3(-3.2, 3.3, 21.5),
      new THREE.Vector3(2.2, 4.2, 21),
      new THREE.Vector3(0, 0.5, 20.2)
    ];
    const mobileCameraTargets = [
      new THREE.Vector3(0, -0.35, 0),
      new THREE.Vector3(0, -0.3, -1.3),
      new THREE.Vector3(0, 0, -2.5),
      new THREE.Vector3(0, -0.2, -3.1),
      new THREE.Vector3(0, -0.25, -3.1)
    ];

    const cameraBase = new THREE.Vector3();
    const cameraTarget = new THREE.Vector3();
    const pointer = new THREE.Vector2();
    const pointerTarget = new THREE.Vector2();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let currentProgress = 0;
    let previousProgress = 0;
    let width = 1;
    let height = 1;
    let isMobile = false;
    let isNearViewport = true;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      isMobile = width < 760;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.5));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.fov = isMobile ? 38 : 34;
      camera.updateProjectionMatrix();
      world.scale.setScalar(isMobile ? 0.78 : width < 1120 ? 0.9 : 1);
    };

    const updatePointer = (event: PointerEvent) => {
      pointerTarget.x = clamp((event.clientX / Math.max(1, window.innerWidth)) * 2 - 1, -1, 1);
      pointerTarget.y = clamp((event.clientY / Math.max(1, window.innerHeight)) * 2 - 1, -1, 1);
    };

    const render = (time: number) => {
      frame = 0;
      if (!isNearViewport || document.hidden) {
        return;
      }

      const bounds = section.getBoundingClientRect();
      const travel = Math.max(1, bounds.height - window.innerHeight);
      const targetProgress = clamp(-bounds.top / travel);
      const follow = reducedMotion.matches ? 1 : 0.2;
      currentProgress += (targetProgress - currentProgress) * follow;
      if (Math.abs(currentProgress - targetProgress) < 0.0001) {
        currentProgress = targetProgress;
      }

      pointer.lerp(pointerTarget, 0.055);
      const progressVelocity = currentProgress - previousProgress;
      previousProgress = currentProgress;

      const pageFan = smoothstep(0.1, 0.39, currentProgress);
      const pageDock = smoothstep(0.63, 0.87, currentProgress);
      const questionExit = smoothstep(0.2, 0.43, currentProgress);
      const modesIn = smoothstep(0.28, 0.5, currentProgress);
      const modesOut = smoothstep(0.66, 0.84, currentProgress);
      const wordmarkIn = smoothstep(0.36, 0.48, currentProgress);
      const wordmarkOut = smoothstep(0.6, 0.76, currentProgress);
      const workspaceIn = smoothstep(0.69, 0.92, currentProgress);

      section.style.setProperty("--three-intro", (1 - smoothstep(0.12, 0.27, currentProgress)).toFixed(4));
      section.style.setProperty("--three-modes", (modesIn * (1 - smoothstep(0.56, 0.7, currentProgress))).toFixed(4));
      section.style.setProperty("--three-assemble", (smoothstep(0.58, 0.7, currentProgress) * (1 - smoothstep(0.78, 0.9, currentProgress))).toFixed(4));
      section.style.setProperty("--three-final", smoothstep(0.84, 0.96, currentProgress).toFixed(4));
      section.style.setProperty("--three-progress", currentProgress.toFixed(4));
      section.dataset.threeProgress = currentProgress.toFixed(3);
      section.dataset.threePhase = currentProgress < 0.25
        ? "question"
        : currentProgress < 0.6
          ? "modes"
          : currentProgress < 0.84
            ? "assemble"
            : "workspace";

      questionGroup.position.set(
        mix(isMobile ? 0 : 3, -5.4, questionExit),
        mix(isMobile ? -0.7 : -0.1, 1.9, questionExit),
        mix(0, -4.2, questionExit)
      );
      questionGroup.rotation.set(
        mix(0.025, -0.16, questionExit),
        mix(-0.06, -0.72, questionExit),
        mix(-0.018, -0.12, questionExit) + (reducedMotion.matches ? 0 : Math.sin(time * 0.00042) * 0.012)
      );
      questionGroup.scale.setScalar(mix(1, 0.68, questionExit));
      setGroupOpacity(questionGroup, 1 - smoothstep(0.34, 0.49, currentProgress));

      pageMeshes.forEach((page, index) => {
        const angle = -1.22 + index * 0.285;
        const radius = 3.8 + index * 0.13;
        const startX = isMobile ? 0 : 0.75;
        const startY = isMobile ? -0.55 : -0.08;
        const startZ = -0.45 - index * 0.085;
        const fanX = Math.sin(angle) * radius + (isMobile ? 0 : 0.55);
        const fanY = -1.62 + index * 0.39;
        const fanZ = -2.8 + Math.cos(angle) * 1.52;
        const dockX = 0.75 + (index - 4.5) * 0.08;
        const dockY = (index - 4.5) * 0.035;
        const dockZ = -3.5 - index * 0.016;
        const stagedX = mix(startX, fanX, pageFan);
        const stagedY = mix(startY, fanY, pageFan);
        const stagedZ = mix(startZ, fanZ, pageFan);

        page.position.set(
          mix(stagedX, dockX, pageDock),
          mix(stagedY, dockY, pageDock),
          mix(stagedZ, dockZ, pageDock)
        );
        page.rotation.set(
          mix(0, Math.sin(angle) * 0.24, pageFan) * (1 - pageDock),
          mix(0, angle * 0.22, pageFan) * (1 - pageDock),
          mix(0, -0.56 + index * 0.125, pageFan) * (1 - pageDock)
        );
        page.scale.setScalar(mix(0.94, 0.72, pageDock));
        const material = page.material as THREE.MeshStandardMaterial;
        material.opacity = clamp((0.24 + pageFan * 0.76) * (1 - modesIn * 0.72) * (1 - pageDock * 0.92));
        page.visible = material.opacity > 0.01;
      });

      modeGroups.forEach((group, index) => {
        const centeredIndex = index - 2;
        const arcY = 0.8 - Math.abs(centeredIndex) * 0.34;
        const spreadX = centeredIndex * 2.64 + (isMobile ? 0 : 1.7);
        const spreadZ = -2.4 - Math.abs(centeredIndex) * 0.2;
        const stagedX = mix(0.5, spreadX, modesIn);
        const stagedY = mix(-0.2, arcY, modesIn);
        const stagedZ = mix(-4.5, spreadZ, modesIn);

        group.position.set(
          mix(stagedX, 0.75 + centeredIndex * 1.22, modesOut),
          mix(stagedY, -1.5 + (index % 2) * 0.1, modesOut),
          mix(stagedZ, -3.15, modesOut)
        );
        group.rotation.set(
          mix(0.24, 0, modesIn) * (1 - modesOut),
          mix(centeredIndex * -0.48, centeredIndex * -0.08, modesIn) * (1 - modesOut),
          mix(centeredIndex * 0.18, centeredIndex * -0.025, modesIn) * (1 - modesOut)
        );
        group.scale.setScalar(mix(0.05, 1.12, modesIn) * mix(1, 0.58, modesOut));
        setGroupOpacity(group, modesIn * (1 - smoothstep(0.77, 0.91, currentProgress)));
      });

      wordmarkGroup.position.set(isMobile ? 0 : 0.6, mix(-0.7, 0.5, wordmarkIn) + wordmarkOut * 0.7, -3.25);
      wordmarkGroup.scale.setScalar(mix(0.58, 1, wordmarkIn) * mix(1, 0.82, wordmarkOut));
      wordmarkGroup.rotation.y = mix(0.18, 0, wordmarkIn);
      setGroupOpacity(wordmarkGroup, wordmarkIn * (1 - wordmarkOut));

      workspaceGroup.position.set(
        mix(0, isMobile ? 0 : 3.2, workspaceIn),
        mix(-4.6, isMobile ? -0.25 : 0, workspaceIn),
        mix(-8.6, -3.25, workspaceIn)
      );
      workspaceGroup.rotation.set(
        mix(0.58, 0.015, workspaceIn),
        mix(-0.25, -0.015, workspaceIn),
        mix(0.08, 0, workspaceIn)
      );
      workspaceGroup.scale.setScalar(mix(0.5, isMobile ? 1.08 : 1.15, workspaceIn));
      setGroupOpacity(workspaceGroup, workspaceIn);
      (workspaceAccent.material as THREE.MeshPhysicalMaterial).opacity = workspaceIn * 0.16;
      workspaceAccent.material.depthWrite = false;

      pathGroup.rotation.z = mix(-0.16, 0.1, currentProgress) + (reducedMotion.matches ? 0 : Math.sin(time * 0.00018) * 0.018);
      pathGroup.position.y = mix(-0.4, 0.75, currentProgress);
      pathGroup.position.x = reducedMotion.matches ? 0 : Math.sin(time * 0.00012) * 0.24;
      pathGroup.scale.setScalar(mix(0.88, 1.08, currentProgress));
      gridMaterials.forEach((material) => {
        material.opacity = mix(0.12, 0.3, smoothstep(0.25, 0.72, currentProgress)) * (1 - workspaceIn * 0.4);
      });

      const activeCameraPositions = isMobile ? mobileCameraPositions : cameraPositions;
      const activeCameraTargets = isMobile ? mobileCameraTargets : cameraTargets;
      setVectorFromKeyframes(cameraBase, activeCameraPositions, currentProgress);
      setVectorFromKeyframes(cameraTarget, activeCameraTargets, currentProgress);
      camera.position.copy(cameraBase);
      camera.position.x += pointer.x * (isMobile ? 0.08 : 0.28);
      camera.position.y -= pointer.y * (isMobile ? 0.05 : 0.18);
      camera.position.z += clamp(Math.abs(progressVelocity) * 58, 0, 0.65);
      camera.lookAt(cameraTarget);
      camera.rotation.z += clamp(progressVelocity * -5.5, -0.028, 0.028);

      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(render);
    };

    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        isNearViewport = entry.isIntersecting;
        if (!isNearViewport && frame) {
          window.cancelAnimationFrame(frame);
          frame = 0;
        } else if (isNearViewport && !frame) {
          frame = window.requestAnimationFrame(render);
        }
      },
      { rootMargin: "100% 0px" }
    );

    const handleVisibilityChange = () => {
      if (document.hidden && frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      } else if (!document.hidden && isNearViewport && !frame) {
        frame = window.requestAnimationFrame(render);
      }
    };

    resize();
    section.dataset.threeReady = "true";
    visibilityObserver.observe(section);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", updatePointer, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    frame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(frame);
      visibilityObserver.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", updatePointer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
      renderer.dispose();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="story"
      className="three-story scroll-scene scene-stack scene-stack--three"
      aria-labelledby="three-story-title"
      data-three-phase="question"
    >
      <div className="three-story__stage">
        <canvas ref={canvasRef} className="three-story__canvas" aria-hidden="true" />
        <div className="three-story__veil" aria-hidden="true" />

        <div className="three-story__hud" aria-hidden="true">
          <span>STUDYBOX LEARNING ENGINE</span>
          <span>SCROLL-DRIVEN 3D</span>
        </div>

        <div className="three-story__copy three-story__copy--intro">
          <p>FROM QUESTION TO UNDERSTANDING</p>
          <h2 id="three-story-title">질문이 들어오는 순간,<br /><strong>생각의 구조가 움직입니다.</strong></h2>
          <span>질문의 의도와 현재 수준을 읽고, 이해하기 좋은 순서로 답변을 다시 설계합니다.</span>
        </div>

        <div className="three-story__copy three-story__copy--modes" aria-hidden="true">
          <p>FIVE LEARNING MODES</p>
          <h3>하나의 질문이<br /><strong>다섯 갈래의 공부로.</strong></h3>
          <span>설명, 풀이, 요약, 시험, 수행평가. 목적에 맞춰 정보의 밀도와 흐름이 달라집니다.</span>
        </div>

        <div className="three-story__copy three-story__copy--assemble" aria-hidden="true">
          <p>ONE CONTINUOUS WORKSPACE</p>
          <h3>흩어진 답이<br /><strong>하나의 학습 흐름으로.</strong></h3>
          <span>대화와 설정, 다음 질문이 끊기지 않는 한 화면으로 모입니다.</span>
        </div>

        <div className="three-story__copy three-story__copy--final">
          <p>YOUR STUDYBOX</p>
          <h3>질문이 쌓일수록,<br /><strong>나만의 공부가 됩니다.</strong></h3>
          <span>지금 필요한 방식과 수준을 고르고, 새로운 학습 대화를 시작하세요.</span>
          <button type="button" onClick={onStart}>AI 학습 시작하기 <b aria-hidden="true">↗</b></button>
        </div>

        <ol className="three-story__progress" aria-hidden="true">
          <li><i />질문</li>
          <li><i />모드</li>
          <li><i />설계</li>
          <li><i />학습</li>
        </ol>

        <div className="three-story__scroll-cue" aria-hidden="true"><i /> SCROLL</div>
      </div>
    </section>
  );
};
