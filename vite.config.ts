import { defineConfig } from 'vite'

export default defineConfig({
	base: '/MultiplayerTowerDefense/',
	server: {
		port: 5173,
		open: true
	},
	preview: {
		port: 5173,
		open: true
	}
}) 