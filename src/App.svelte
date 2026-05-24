<script lang="ts">
	import { writable, type Writable } from 'svelte/store';

	interface Node {
		id: string;
		x: number;
		y: number;
		label: string;
		icon: string;
		type: string;
		color: string;
	}

	type PortPosition = 'top' | 'right' | 'bottom' | 'left';

	interface Connection {
		id: string;
		from: string;
		fromPort: PortPosition;
		to: string;
		toPort: PortPosition;
	}

	let nodes: Writable<Node[]> = writable([
		{ id: '1', x: 100, y: 100, label: 'Start Flow', icon: '⚡', type: 'Trigger', color: '#6366f1' },
		{ id: '2', x: 400, y: 100, label: 'Wait Interval', icon: '⏱️', type: 'Delay', color: '#f59e0b' },
		{ id: '3', x: 700, y: 100, label: 'Send Notification', icon: '▶️', type: 'Action', color: '#10b981' }
	]);

	let connections: Writable<Connection[]> = writable([
		{ id: 'c1', from: '1', fromPort: 'right', to: '2', toPort: 'left' },
		{ id: 'c2', from: '2', fromPort: 'right', to: '3', toPort: 'left' }
	]);

	let nodeCounter = 4;
	let connectionCounter = 3;
	let draggedNode = $state<Node | null>(null);
	let dragOffset = { x: 0, y: 0 };
	let dragPosition = $state({ x: 0, y: 0 });
	let connectionStart = $state<{ node: Node; port: PortPosition } | null>(null);
	let connectionMousePos = $state({ x: 0, y: 0 });
	let hoveredPort = $state<{ node: Node; port: PortPosition } | null>(null);
	let workspaceElement: HTMLElement;

	function addNode(type: string) {
		const configs: Record<string, { icon: string; label: string; color: string }> = {
			trigger: { icon: '⚡', label: 'Trigger', color: '#6366f1' },
			delay: { icon: '⏱️', label: 'Delay', color: '#f59e0b' },
			action: { icon: '▶️', label: 'Action', color: '#10b981' },
			condition: { icon: '❓', label: 'Condition', color: '#8b5cf6' }
		};

		const config = configs[type];
		nodes.update(n => [
			...n,
			{
				id: String(nodeCounter++),
				x: 100 + Math.random() * 400,
				y: 100 + Math.random() * 300,
				label: `${config.label} ${nodeCounter - 1}`,
				icon: config.icon,
				type: config.label,
				color: config.color
			}
		]);
	}

	function startDrag(event: MouseEvent, node: Node) {
		if ((event.target as HTMLElement).classList.contains('port')) return;
		event.preventDefault();
		draggedNode = node;
		dragPosition = { x: node.x, y: node.y };
		dragOffset = {
			x: event.clientX - node.x,
			y: event.clientY - node.y
		};
	}

	function handleMouseMove(event: MouseEvent) {
		if (draggedNode) {
			dragPosition = {
				x: event.clientX - dragOffset.x,
				y: event.clientY - dragOffset.y
			};
		} else if (connectionStart && workspaceElement) {
			const rect = workspaceElement.getBoundingClientRect();
			connectionMousePos = {
				x: event.clientX - rect.left,
				y: event.clientY - rect.top
			};
		}
	}

	function handleMouseUp() {
		if (draggedNode) {
			nodes.update(n => n.map(node => 
				node.id === draggedNode!.id 
					? { ...node, x: dragPosition.x, y: dragPosition.y }
					: node
			));
			draggedNode = null;
		} else if (connectionStart && hoveredPort) {
			// Complete connection on mouseup if hovering over a port
			if (connectionStart.node.id !== hoveredPort.node.id) {
				connections.update(c => [
					...c,
					{ 
						id: `c${connectionCounter++}`, 
						from: connectionStart!.node.id, 
						fromPort: connectionStart!.port,
						to: hoveredPort!.node.id,
						toPort: hoveredPort!.port
					}
				]);
			}
			connectionStart = null;
			hoveredPort = null;
		} else if (connectionStart) {
			// Cancel connection if mouseup not on a port
			connectionStart = null;
		}
	}

	function startConnection(event: MouseEvent, node: Node, port: PortPosition) {
		event.stopPropagation();
		event.preventDefault();
		connectionStart = { node, port };
		hoveredPort = { node, port };
		if (workspaceElement) {
			const rect = workspaceElement.getBoundingClientRect();
			connectionMousePos = {
				x: event.clientX - rect.left,
				y: event.clientY - rect.top
			};
		}
	}

	function endConnection(event: MouseEvent, node: Node, port: PortPosition) {
		event.stopPropagation();
		event.preventDefault();
		hoveredPort = { node, port };
	}

	function onPortEnter(node: Node, port: PortPosition) {
		if (connectionStart) {
			hoveredPort = { node, port };
		}
	}

	function onPortLeave() {
		if (connectionStart) {
			hoveredPort = null;
		}
	}

	function cancelConnection() {
		if (connectionStart) {
			connectionStart = null;
		}
	}

	function getPortCoordinates(node: Node, port: PortPosition, isDragging: boolean): { x: number; y: number } {
		const x = isDragging ? dragPosition.x : node.x;
		const y = isDragging ? dragPosition.y : node.y;
		const nodeWidth = 240;
		const nodeHeight = 64;

		switch (port) {
			case 'top':
				return { x: x + nodeWidth / 2, y: y };
			case 'right':
				return { x: x + nodeWidth, y: y + nodeHeight / 2 };
			case 'bottom':
				return { x: x + nodeWidth / 2, y: y + nodeHeight };
			case 'left':
				return { x: x, y: y + nodeHeight / 2 };
		}
	}

	function getConnectionPath(conn: Connection, nodesList: Node[]): string {
		const fromNode = nodesList.find(n => n.id === conn.from);
		const toNode = nodesList.find(n => n.id === conn.to);
		if (!fromNode || !toNode) return '';

		const from = getPortCoordinates(fromNode, conn.fromPort, draggedNode?.id === fromNode.id);
		const to = getPortCoordinates(toNode, conn.toPort, draggedNode?.id === toNode.id);

		const midX = (from.x + to.x) / 2;
		return `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;
	}

	function getTempConnectionPath(): string {
		if (!connectionStart) return '';
		const from = getPortCoordinates(connectionStart.node, connectionStart.port, false);
		const to = { x: connectionMousePos.x, y: connectionMousePos.y };
		const midX = (from.x + to.x) / 2;
		return `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;
	}

	function clearAll() {
		if (confirm('Clear all nodes and connections?')) {
			nodes.set([]);
			connections.set([]);
			nodeCounter = 0;
			connectionCounter = 0;
		}
	}
</script>

<svelte:window on:mousemove={handleMouseMove} on:mouseup={handleMouseUp} />

<div class="app-container">
	<div class="toolbar">
		<button class="btn" onclick={() => addNode('trigger')}>
			<span>⚡</span> Trigger
		</button>
		<button class="btn" onclick={() => addNode('delay')}>
			<span>⏱️</span> Delay
		</button>
		<button class="btn" onclick={() => addNode('action')}>
			<span>▶️</span> Action
		</button>
		<button class="btn" onclick={() => addNode('condition')}>
			<span>❓</span> Condition
		</button>
		<button class="btn btn-danger" onclick={clearAll}>
			Clear
		</button>
	</div>

	<div class="workspace" bind:this={workspaceElement} onclick={cancelConnection} onkeydown={(e) => e.key === 'Escape' && cancelConnection()} role="button" tabindex="0">
		<svg class="connections-layer">
			<defs>
				<marker id="arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
					<polygon points="0 0, 8 3, 0 6" fill="#6366f1" />
				</marker>
			</defs>
			{#each $connections as conn (conn.id)}
				<path
					d={getConnectionPath(conn, $nodes)}
					stroke="#6366f1"
					stroke-width="2"
					fill="none"
					stroke-dasharray="5 5"
					marker-end="url(#arrowhead)"
					class="connection-path"
				/>
			{/each}
			{#if connectionStart}
				<path
					d={getTempConnectionPath()}
					stroke="#8b5cf6"
					stroke-width="2"
					fill="none"
					stroke-dasharray="5 5"
					class="connection-path temp-connection"
				/>
			{/if}
		</svg>

		<div class="nodes-layer">
			{#each $nodes as node (node.id)}
				<div
					class="workflow-node"
					class:dragging={draggedNode?.id === node.id}
					style="left: {draggedNode?.id === node.id ? dragPosition.x : node.x}px; top: {draggedNode?.id === node.id ? dragPosition.y : node.y}px;"
					onmousedown={(e) => startDrag(e, node)}
					onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') startDrag(e as any, node); }}
					onclick={(e) => e.stopPropagation()}
					role="button"
					tabindex="0"
				>
					<div class="node-content">
						<div class="node-icon" style="background: {node.color}">
							{node.icon}
						</div>
						<div class="node-info">
							<div class="node-title">{node.label}</div>
							<div class="node-subtitle">{node.type}</div>
						</div>
					</div>
					<div class="port port-top" onmousedown={(e) => startConnection(e, node, 'top')} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') startConnection(e as any, node, 'top'); }} onmouseenter={() => onPortEnter(node, 'top')} onmouseleave={onPortLeave} onclick={(e) => e.stopPropagation()} role="button" tabindex="0"></div>
					<div class="port port-right" onmousedown={(e) => startConnection(e, node, 'right')} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') startConnection(e as any, node, 'right'); }} onmouseenter={() => onPortEnter(node, 'right')} onmouseleave={onPortLeave} onclick={(e) => e.stopPropagation()} role="button" tabindex="0"></div>
					<div class="port port-bottom" onmousedown={(e) => startConnection(e, node, 'bottom')} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') startConnection(e as any, node, 'bottom'); }} onmouseenter={() => onPortEnter(node, 'bottom')} onmouseleave={onPortLeave} onclick={(e) => e.stopPropagation()} role="button" tabindex="0"></div>
					<div class="port port-left" onmousedown={(e) => startConnection(e, node, 'left')} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') startConnection(e as any, node, 'left'); }} onmouseenter={() => onPortEnter(node, 'left')} onmouseleave={onPortLeave} onclick={(e) => e.stopPropagation()} role="button" tabindex="0"></div>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: system-ui, -apple-system, sans-serif;
		overflow: hidden;
	}

	.app-container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: #1a1a2e;
	}

	.toolbar {
		padding: 16px 24px;
		display: flex;
		gap: 8px;
		background: #16213e;
		border-bottom: 1px solid #2a2a40;
		z-index: 10;
	}

	.btn {
		padding: 8px 16px;
		border: 1px solid #3a3a50;
		border-radius: 6px;
		background: #2a2a40;
		color: #e5e7eb;
		cursor: pointer;
		font-size: 13px;
		display: flex;
		align-items: center;
		gap: 6px;
		transition: all 0.2s;
	}

	.btn:hover {
		background: #3a3a50;
		border-color: #6366f1;
	}

	.btn-danger {
		background: #451a1a;
		border-color: #7f1d1d;
		color: #fca5a5;
	}

	.btn-danger:hover {
		background: #7f1d1d;
	}

	.workspace {
		flex: 1;
		position: relative;
		overflow: hidden;
		background-image: radial-gradient(circle, #2a2a3e 1px, transparent 1px);
		background-size: 20px 20px;
	}

	.connections-layer {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 1;
	}

	.connection-path {
		filter: drop-shadow(0 0 4px rgba(99, 102, 241, 0.3));
	}

	.temp-connection {
		opacity: 0.6;
		filter: drop-shadow(0 0 6px rgba(139, 92, 246, 0.5));
	}

	.nodes-layer {
		position: relative;
		width: 100%;
		height: 100%;
		z-index: 2;
	}

	.workflow-node {
		position: absolute;
		width: 240px;
		background: #2a2a40;
		border: 1px solid #3a3a50;
		border-radius: 8px;
		cursor: move;
		transition: border-color 0.2s, box-shadow 0.2s;
		user-select: none;
		will-change: transform;
	}

	.workflow-node.dragging {
		transition: none;
		z-index: 100;
		border-color: #6366f1;
		box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3);
	}

	.workflow-node:hover {
		border-color: #6366f1;
		box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
	}

	.node-content {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px;
	}

	.node-icon {
		width: 40px;
		height: 40px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 20px;
		flex-shrink: 0;
	}

	.node-info {
		flex: 1;
		min-width: 0;
	}

	.node-title {
		font-size: 14px;
		font-weight: 600;
		color: #f3f4f6;
		margin-bottom: 2px;
	}

	.node-subtitle {
		font-size: 11px;
		color: #9ca3af;
	}

	.port {
		position: absolute;
		width: 12px;
		height: 12px;
		background: #6366f1;
		border: 2px solid #2a2a40;
		border-radius: 50%;
		cursor: crosshair;
		transition: all 0.2s;
		z-index: 10;
	}

	.port:hover {
		box-shadow: 0 0 8px rgba(99, 102, 241, 0.6);
	}

	.port-top {
		top: -6px;
		left: 50%;
		transform: translateX(-50%);
	}

	.port-top:hover {
		transform: translateX(-50%) scale(1.3);
	}

	.port-right {
		right: -6px;
		top: 50%;
		transform: translateY(-50%);
	}

	.port-right:hover {
		transform: translateY(-50%) scale(1.3);
	}

	.port-bottom {
		bottom: -6px;
		left: 50%;
		transform: translateX(-50%);
	}

	.port-bottom:hover {
		transform: translateX(-50%) scale(1.3);
	}

	.port-left {
		left: -6px;
		top: 50%;
		transform: translateY(-50%);
	}

	.port-left:hover {
		transform: translateY(-50%) scale(1.3);
	}
</style>
