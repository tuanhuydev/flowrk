<script lang="ts">
	import { Handle, Position } from '@xyflow/svelte';

	export let data: {
		label: string;
		icon: string;
		type: string;
	};

	const colors: Record<string, string> = {
		Trigger: '#6366f1',
		Delay: '#f59e0b',
		Action: '#10b981',
		Condition: '#8b5cf6'
	};

	const color = colors[data.type] || '#6366f1';
</script>

<div class="custom-node">
	<Handle type="target" position={Position.Left} />
	
	<div class="node-content">
		<div class="node-icon" style="background: {color}">
			{data.icon}
		</div>
		<div class="node-info">
			<div class="node-title">{data.label}</div>
			<div class="node-subtitle">{data.type}</div>
		</div>
	</div>

	<Handle type="source" position={Position.Right} />
</div>

<style>
	.custom-node {
		background: #2a2a40;
		border: 1px solid #3a3a50;
		border-radius: 8px;
		padding: 12px;
		min-width: 240px;
		transition: all 0.2s;
	}

	.custom-node:hover {
		border-color: #6366f1;
		box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
	}

	.node-content {
		display: flex;
		align-items: center;
		gap: 12px;
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

	:global(.custom-node .svelte-flow__handle) {
		width: 12px;
		height: 12px;
		background: #6366f1;
		border: 2px solid #2a2a40;
	}

	:global(.custom-node .svelte-flow__handle:hover) {
		transform: scale(1.3);
		box-shadow: 0 0 8px rgba(99, 102, 241, 0.6);
	}
</style>
