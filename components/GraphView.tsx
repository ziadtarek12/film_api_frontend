
import React, { useEffect, useRef, useState } from 'react';
import { Film } from '../types';
import { useNavigate } from 'react-router-dom';

interface GraphViewProps {
  films: Film[];
}

interface Node {
  id: string;
  type: 'film' | 'genre' | 'director';
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  data?: any;
}

interface Link {
  source: string;
  target: string;
}

export const GraphView: React.FC<GraphViewProps> = ({ films }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  // State for simulation
  const nodesRef = useRef<Node[]>([]);
  const linksRef = useRef<Link[]>([]);
  const requestRef = useRef<number>();
  const draggingRef = useRef<Node | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);

  // Initialize Graph Data
  useEffect(() => {
    const nodes: Node[] = [];
    const links: Link[] = [];
    const nodeMap = new Set<string>();

    const addNode = (id: string, type: 'film' | 'genre' | 'director', label: string, data?: any) => {
      if (nodeMap.has(id)) return;
      nodeMap.add(id);
      
      let color = '#fff';
      let radius = 5;

      if (type === 'film') {
        color = '#0ea5e9'; // primary-500
        // Reduced size: Base 5 + rating * 0.8 (Max ~13px)
        radius = 5 + ((data?.rating || 0) * 0.8); 
      } else if (type === 'genre') {
        color = '#ec4899'; // pink-500
        radius = 7;
      } else if (type === 'director') {
        color = '#fbbf24'; // amber-400
        radius = 6;
      }

      nodes.push({
        id,
        type,
        label,
        x: Math.random() * 800,
        y: Math.random() * 600,
        vx: 0,
        vy: 0,
        radius,
        color,
        data
      });
    };

    films.forEach(film => {
      const filmId = `f-${film.id}`;
      addNode(filmId, 'film', film.title, film);

      // Link Genres
      film.genres.forEach(g => {
        const genreId = `g-${g}`;
        addNode(genreId, 'genre', g);
        links.push({ source: filmId, target: genreId });
      });

      // Link Directors (Limit to 1st director to avoid clutter)
      if (film.directors.length > 0) {
        const d = film.directors[0];
        const dirId = `d-${d}`;
        addNode(dirId, 'director', d);
        links.push({ source: filmId, target: dirId });
      }
    });

    nodesRef.current = nodes;
    linksRef.current = links;

    // Initial Center layout
    if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        const cx = width / 2;
        const cy = height / 2;
        nodes.forEach(n => {
            n.x = cx + (Math.random() - 0.5) * 200;
            n.y = cy + (Math.random() - 0.5) * 200;
        });
    }

  }, [films]);

  // Simulation Loop
  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use internal dimensions (scaled) vs logical dimensions
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);

    // Physics constants
    const repulsion = 1500; // Reduced slightly
    const springLength = 100; // Reduced slightly to keep related items closer since nodes are smaller
    const k = 0.08; // Spring stiffness
    const damping = 0.85; // Friction
    const centerForce = 0.03;
    const maxVelocity = 15; // Terminal velocity

    const nodes = nodesRef.current;
    const links = linksRef.current;

    // 1. Calculate Forces
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      
      // Skip physics for dragged node (mouse controls it)
      if (a === draggingRef.current) continue;

      // Center Gravity
      const dxC = (width / 2) - a.x;
      const dyC = (height / 2) - a.y;
      a.vx += dxC * centerForce;
      a.vy += dyC * centerForce;

      // Repulsion (All vs All)
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        
        if (dist < 300) { // Reduced distance threshold
          const force = repulsion / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }
      }
    }

    // Spring (Links)
    links.forEach(link => {
      const source = nodes.find(n => n.id === link.source);
      const target = nodes.find(n => n.id === link.target);
      if (source && target) {
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - springLength) * k;
        
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (source !== draggingRef.current) {
            source.vx += fx;
            source.vy += fy;
        }
        if (target !== draggingRef.current) {
            target.vx -= fx;
            target.vy -= fy;
        }
      }
    });

    // 2. Update Positions
    nodes.forEach(n => {
      if (n !== draggingRef.current) {
        // Cap velocity
        const v = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
        if (v > maxVelocity) {
            n.vx = (n.vx / v) * maxVelocity;
            n.vy = (n.vy / v) * maxVelocity;
        }

        n.vx *= damping;
        n.vy *= damping;
        
        // Extra dampening if hovered to make clicking easier
        if (n.id === hoveredNode?.id) {
            n.vx *= 0.1;
            n.vy *= 0.1;
        }

        n.x += n.vx;
        n.y += n.vy;
      }
      
      // Boundaries (Bounce)
      const padding = n.radius + 10;
      if (n.x < padding) { n.x = padding; n.vx *= -1; }
      if (n.x > width - padding) { n.x = width - padding; n.vx *= -1; }
      if (n.y < padding) { n.y = padding; n.vy *= -1; }
      if (n.y > height - padding) { n.y = height - padding; n.vy *= -1; }
    });

    // 3. Draw
    const dpr = window.devicePixelRatio || 1;
    // Clear the full scaled canvas
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Apply scaling for HiDPI
    ctx.scale(dpr, dpr);

    // Draw Links
    ctx.strokeStyle = '#334155'; // Slate 700
    ctx.lineWidth = 1;
    ctx.beginPath();
    links.forEach(link => {
      const source = nodes.find(n => n.id === link.source);
      const target = nodes.find(n => n.id === link.target);
      if (source && target) {
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
      }
    });
    ctx.stroke();

    // Draw Nodes
    nodes.forEach(n => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      ctx.fillStyle = n.color;
      ctx.fill();
      
      // Glow effect for films
      if (n.type === 'film') {
        ctx.shadowBlur = 10; // Reduced glow
        ctx.shadowColor = n.color;
      } else {
        ctx.shadowBlur = 0;
      }
      
      // Stroke
      ctx.strokeStyle = hoveredNode?.id === n.id ? '#fff' : '#1e293b';
      ctx.lineWidth = hoveredNode?.id === n.id ? 2 : 1; // Thinner stroke
      ctx.stroke();
      ctx.shadowBlur = 0; // Reset

      // Text Labels
      // Draw label if hovered OR if it's a Film node OR if connected to hovered node
      const isConnected = hoveredNode && links.some(l => (l.source === n.id && l.target === hoveredNode.id) || (l.target === n.id && l.source === hoveredNode.id));
      
      if (n.type === 'film' || n === hoveredNode || isConnected) {
        ctx.fillStyle = '#f8fafc'; // Slate 50
        ctx.font = `600 ${n.type === 'film' ? '10px' : '9px'} Inter`; // Smaller font
        ctx.textAlign = 'center';
        
        // Text Shadow/Stroke for readability
        ctx.lineWidth = 2; // Thinner text outline
        ctx.strokeStyle = '#0f172a'; // Slate 900 background for text
        ctx.strokeText(n.label, n.x, n.y + n.radius + 12);
        ctx.fillText(n.label, n.x, n.y + n.radius + 12);
      }
    });

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [hoveredNode]); // Re-bind if hover changes to ensure reactivity

  // Handle Resize with Observer
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
            const { width, height } = entry.contentRect;
            const dpr = window.devicePixelRatio || 1;
            
            if (canvasRef.current) {
                // Set logical size for CSS
                canvasRef.current.style.width = `${width}px`;
                canvasRef.current.style.height = `${height}px`;
                // Set actual size for formatting (scaled)
                canvasRef.current.width = width * dpr;
                canvasRef.current.height = height * dpr;
            }
        }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Interaction Handlers
  const getMousePos = (e: React.MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const { x, y } = getMousePos(e);
    const node = nodesRef.current.find(n => {
      const dx = n.x - x;
      const dy = n.y - y;
      return dx * dx + dy * dy < (n.radius + 10) ** 2; // Hitbox padding
    });

    if (node) {
      draggingRef.current = node;
      // Stop velocity so it doesn't fight the mouse
      node.vx = 0;
      node.vy = 0;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const { x, y } = getMousePos(e);
    mouseRef.current = { x, y };

    if (draggingRef.current) {
      draggingRef.current.x = x;
      draggingRef.current.y = y;
      draggingRef.current.vx = 0;
      draggingRef.current.vy = 0;
    }

    // Check hover
    const node = nodesRef.current.find(n => {
      const dx = n.x - x;
      const dy = n.y - y;
      return dx * dx + dy * dy < (n.radius + 10) ** 2;
    });
    setHoveredNode(node || null);
    
    // Change cursor
    if (canvasRef.current) {
        canvasRef.current.style.cursor = node ? 'pointer' : 'default';
    }
  };

  const handleMouseUp = () => {
    draggingRef.current = null;
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
      const { x, y } = getMousePos(e);
      const node = nodesRef.current.find(n => {
        const dx = n.x - x;
        const dy = n.y - y;
        return dx * dx + dy * dy < (n.radius + 10) ** 2;
      });
      
      if (node && node.type === 'film' && node.data) {
          navigate(`/film/${node.data.id}`);
      }
  };

  return (
    <div ref={containerRef} className="w-full h-[600px] bg-secondary-900 rounded-xl border border-secondary-700 overflow-hidden relative shadow-inner">
      <div className="absolute top-4 left-4 z-10 pointer-events-none bg-secondary-900/80 backdrop-blur p-2 rounded-lg border border-secondary-700/50">
          <div className="flex items-center gap-2 mb-1"><div className="w-2.5 h-2.5 rounded-full bg-primary-500 shadow shadow-primary-500"></div><span className="text-xs text-gray-300">Film (Double Click)</span></div>
          <div className="flex items-center gap-2 mb-1"><div className="w-2.5 h-2.5 rounded-full bg-pink-500"></div><span className="text-xs text-gray-300">Genre</span></div>
          <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div><span className="text-xs text-gray-300">Director</span></div>
      </div>
      <canvas 
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        className="block w-full h-full touch-none"
      />
    </div>
  );
};
