---
name: figma-local-svg
description: Use when creating or revising Figma-ready screen designs for this QR project. Create an editable local SVG for the user to copy into Figma.
---

# Figma 시안은 로컬 SVG로 작업

이 프로젝트의 화면 시안을 만들거나 수정할 때 결과물을 **로컬 SVG 파일**로 저장한다. 사용자가 SVG를 Figma에 직접 복사해 붙여넣는다. Figma 링크는 확정 화면을 확인하는 기준 자료로 사용한다.

1. `docs/설계안.md`, 루트 `AGENTS.md`, 최신 로컬 시안을 확인한다. 자료 간 차이가 있으면 사용자에게 알린다.
2. 전체 화면 수정은 `output/QR_생성_전체_화면시안_Figma_붙여넣기.svg`에 반영한다. 별도 화면이나 요소를 요청받으면 `output/`에 용도를 알 수 있는 이름의 SVG를 만든다.
3. Figma에서 수정할 수 있도록 텍스트와 도형을 SVG 요소로 유지하고, 외부 파일에 의존하지 않는 완전한 SVG로 저장한다.
4. SVG 문법과 화면 배치를 확인한 뒤, 완성 파일의 로컬 경로를 사용자에게 전달한다. Figma에 붙여넣는 작업은 사용자가 한다.

사용자가 작업 방식을 새로 지정하기 전까지 Figma 원본 파일에 직접 쓰는 작업은 진행하지 않는다.
