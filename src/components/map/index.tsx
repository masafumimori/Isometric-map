import React, { useRef } from 'react';
import Canvas from '../canvas';
import { getTileImages } from './tiles/get-tile-images';
import Tile from './tiles/tile';

export type MapProps = {
	width: number | undefined;
	height: number | undefined;
};

const DEFAULT_MAP_SCALE = 1;
const DEFAULT_DELTA_X = 1;
// Set temporarily (Should be changed once the requirements for UI/UX are all determined)
const ZOOM_SENSITIVITY = 0.0001;
const MAX_SCALE = 2;
const MIN_SCALE = 0.8;
const HORIZONTAL_SCROLL_SENSITIVITY = 0.05;

// TODO: FIGURE OUT HOW THIS IS DETERMINED
const MAGIC_NUMBER_TO_ADJUST = 80;

const Map = ({ width, height }: MapProps) => {
	const mouseRef = useRef({ x: -1, y: -1 });
	const startPositionRef = useRef({ x: -1, y: -1 });

	// This shows which tile image should be displayed(index of TILE_TEXTURES fetched by getTileImages())
	const tileMap = [
		14, 23, 23, 23, 23, 23, 23, 23, 23, 13, 21, 32, 33, 33, 28, 33, 33, 33, 31,
		20, 21, 34, 9, 9, 34, 1, 1, 1, 34, 20, 21, 34, 4, 4, 34, 1, 1, 10, 34, 20,
		21, 25, 33, 33, 24, 33, 33, 33, 27, 20, 21, 34, 4, 7, 34, 18, 17, 10, 34,
		20, 21, 34, 6, 8, 34, 16, 19, 10, 34, 20, 21, 34, 1, 1, 34, 10, 10, 10, 34,
		20, 21, 29, 33, 33, 26, 33, 33, 33, 30, 20, 11, 22, 22, 22, 22, 22, 22, 22,
		22, 12,
	];

	const renderTileHover =
		(ctx: CanvasRenderingContext2D) => (x: number, y: number) => {
			ctx.beginPath();
			ctx.setLineDash([]);
			ctx.strokeStyle = 'rgba(192, 57, 43, 0.8)';
			ctx.fillStyle = 'rgba(192, 57, 43, 0.4)';
			ctx.lineWidth = 2;
			ctx.moveTo(x, y);
			ctx.lineTo(x + Tile.TILE_WIDTH / 2, y - Tile.TILE_HEIGHT / 2);
			ctx.lineTo(x + Tile.TILE_WIDTH, y);
			ctx.lineTo(x + Tile.TILE_WIDTH / 2, y + Tile.TILE_HEIGHT / 2);
			ctx.lineTo(x, y);
			ctx.stroke();
			ctx.fill();
		};

	const renderTiles =
		(ctx: CanvasRenderingContext2D) => (x: number, y: number) => {
			const gridSize = Math.sqrt(tileMap.length);
			const images = getTileImages();

			for (let tileX = 0; tileX < gridSize; ++tileX) {
				for (let tileY = 0; tileY < gridSize; ++tileY) {
					const imageIndex = tileMap[tileY * gridSize + tileX];

					const tile: Tile = new Tile({
						tileImage: images[imageIndex],
						mapStartPosition: { ...{ x, y } },
						tileIndex: { x: tileX, y: tileY },
						ctx,
					});
					tile.drawTile(MAGIC_NUMBER_TO_ADJUST);
				}
			}

			const { e: xPos, f: yPos } = ctx.getTransform();

			const mouse_x = mouseRef.current.x - x - xPos;
			const mouse_y = mouseRef.current.y - y - yPos;

			const hoverTileX =
				Math.floor(mouse_y / Tile.TILE_HEIGHT + mouse_x / Tile.TILE_WIDTH) - 1;
			const hoverTileY = Math.floor(
				-mouse_x / Tile.TILE_WIDTH + mouse_y / Tile.TILE_HEIGHT
			);

			if (
				hoverTileX >= 0 &&
				hoverTileY >= 0 &&
				hoverTileX < gridSize &&
				hoverTileY < gridSize
			) {
				const renderX = x + (hoverTileX - hoverTileY) * Tile.TILE_HALF_WIDTH;
				const renderY = y + (hoverTileX + hoverTileY) * Tile.TILE_HALF_HEIGHT;

				renderTileHover(ctx)(renderX, renderY + Tile.TILE_HEIGHT);
			}
		};

	const renderBackground = (ctx: CanvasRenderingContext2D) => {
		// Can/Should change the color once UI design is determined
		ctx.fillStyle = '#151d26';
		ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
	};

	const render = (ctx: CanvasRenderingContext2D) => {
		if (!width || !height) return;

		const gridSize = Math.sqrt(tileMap.length);

		const offsetX = Tile.TILE_WIDTH / 2;
		const offsetY = Tile.TILE_HEIGHT;

		const remainingHeight = height - Tile.TILE_HEIGHT * gridSize;

		const tileStartX = width / 2 - offsetX;
		// MAGIC_NUMBER_TO_ADJUST is to adjust position when calling Tile.drawTile()
		const tileStartY = remainingHeight / 2 + offsetY - MAGIC_NUMBER_TO_ADJUST;

		startPositionRef.current = { x: tileStartX, y: tileStartY };

		renderBackground(ctx);

		renderTiles(ctx)(tileStartX, tileStartY);
	};

	const onScrollY = (ctx: CanvasRenderingContext2D, e: WheelEvent) => {
		const currentScale = ctx.getTransform().a;
		const zoomAmount = e.deltaY * ZOOM_SENSITIVITY;

		// When reaching MAX_SCALE, it only allows zoom OUT (= negative zoomAmount)
		// When reaching MIN_SCALE, it only allows zoom IN (= positive zoomAmount)
		if (currentScale >= MAX_SCALE && zoomAmount > 0) return;
		if (currentScale <= MIN_SCALE && zoomAmount < 0) return;

		const scale = DEFAULT_MAP_SCALE + zoomAmount;

		ctx.translate(e.offsetX, e.offsetY);
		ctx.scale(scale, scale);
		ctx.translate(-e.offsetX, -e.offsetY);
	};

	const onScrollX = (ctx: CanvasRenderingContext2D, e: WheelEvent) => {
		const moveAmount =
			DEFAULT_DELTA_X * e.deltaX * HORIZONTAL_SCROLL_SENSITIVITY;

		// Only allows x axis move
		ctx.translate(moveAmount, 0);
	};

	const onWheel = (ctx: CanvasRenderingContext2D, e: WheelEvent) => {
		onScrollY(ctx, e);
		onScrollX(ctx, e);
	};

	const onMouseMove = (ctx: CanvasRenderingContext2D, e: MouseEvent) => {
		const rect = ctx.canvas.getBoundingClientRect();

		mouseRef.current = {
			x: e.clientX - rect.left,
			y: e.clientY - rect.top,
		};
	};

	const onClick = (ctx: CanvasRenderingContext2D, e: MouseEvent) => {
		const gridSize = Math.sqrt(tileMap.length);

		const { e: xPos, f: yPos } = ctx.getTransform();

		const mouse_x = e.clientX - startPositionRef.current.x - xPos;
		const mouse_y = e.clientY - startPositionRef.current.y - yPos;

		const hoverTileX =
			Math.floor(mouse_y / Tile.TILE_HEIGHT + mouse_x / Tile.TILE_WIDTH) - 1;
		const hoverTileY = Math.floor(
			-mouse_x / Tile.TILE_WIDTH + mouse_y / Tile.TILE_HEIGHT
		);

		if (
			hoverTileX >= 0 &&
			hoverTileY >= 0 &&
			hoverTileX < gridSize &&
			hoverTileY < gridSize
		) {
			const tileIndex = hoverTileY * gridSize + hoverTileX;
			if (tileIndex < tileMap.length) {
				// TODO: temporary switch tile randomly
				const tileType = Math.floor(Math.random() * tileMap.length) % 35;
				tileMap[tileIndex] = tileType;
			}
		}
	};

	return (
		<Canvas
			drawOnCanvas={render}
			onWheel={onWheel}
			onMouseMove={onMouseMove}
			onClick={onClick}
			attributes={{ width, height }}
		/>
	);
};

export default Map;
