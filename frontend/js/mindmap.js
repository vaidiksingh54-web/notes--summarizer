/**
 * CogniStudy AI - Visual Mind Map Maker Controller & Engine
 * Bilateral radial tree layout, interactive SVG rendering, pan/zoom canvas, and export.
 */

const DEMO_WATER_NOTES = `Water Conservation & Sustainable Hydrological Management

1. Introduction
Water is the fundamental life-sustaining natural resource. Conservation ensures maintaining freshwater supplies against rapidly diminishing global sources and climate variability.

2. Causes of Scarcity
Accelerating water scarcity is driven by severe environmental pollution, especially industrial waste discharge and agricultural chemical runoffs (pesticides & fertilizers). Excessive wastage and irresponsible domestic and commercial consumption severely compound the depletion.

3. Prevention Methods
Mitigation requires implementing proper civic management systems, extensive community awareness programmes, and widespread rainwater harvesting infrastructure to recharge aquifers.

4. Daily Water Saving Tips
Immediate domestic practices include:
- Fixing leaky faucets and plumbing fixtures
- Washing vehicles using buckets and mugs rather than running hoses
- Installing shower flow restrictors and aerators
- Running dishwashers and washing machines only with full loads
- Installing dual-flush toilets to minimize volume per flush
- Reusing vegetable washing water for house plants and garden beds

5. Conclusion
With exponential population growth and industrial expansion, water demand will continue to soar. Citizen responsibility, community stewardship, and technological water recycling are essential for ecological resilience.`;

const BRANCH_COLORS = [
  "#f97316", // Warm Orange
  "#ec4899", // Vibrant Rose
  "#a855f7", // Royal Purple
  "#38bdf8", // Sky Cyan
  "#10b981", // Emerald Green
  "#eab308", // Sun Amber
  "#06b6d4", // Electric Teal
  "#f43f5e"  // Coral Red
];

class MindMapApp {
  constructor() {
    this.rootData = null;
    this.scale = 1;
    this.panX = 0;
    this.panY = 0;
    this.isPanning = false;
    this.startX = 0;
    this.startY = 0;
    this.activeTool = "select"; // 'select' | 'pan'
    this.collapsedIds = new Set();
    this.selectedNode = null;
    this.isFullscreen = false;

    this.container = null;
    this.svg = null;
    this.viewport = null;
  }

  async init() {
    this.container = document.getElementById("mindmap-canvas-container");
    this.svg = document.getElementById("mindmap-svg");
    this.viewport = document.getElementById("mindmap-viewport");

    this.initCanvasEvents();
    this.initToolbarEvents();
    this.initInputControls();

    await window.store.ready;
    this.checkUrlParams();
  }

  initCanvasEvents() {
    if (!this.container) return;

    // Pan with mouse drag
    this.container.addEventListener("mousedown", (e) => {
      // Ignore if clicking on an interactive control or button
      if (e.target.closest(".mm-dock-btn, .mm-top-pill, .mm-inspector-panel, .dropdown-menu, .btn, .mm-toggle-circle")) {
        return;
      }
      this.isPanning = true;
      this.startX = e.clientX - this.panX;
      this.startY = e.clientY - this.panY;
      this.container.classList.add("panning");
    });

    window.addEventListener("mousemove", (e) => {
      if (!this.isPanning) return;
      this.panX = e.clientX - this.startX;
      this.panY = e.clientY - this.startY;
      this.updateTransform();
    });

    window.addEventListener("mouseup", () => {
      if (this.isPanning) {
        this.isPanning = false;
        this.container?.classList.remove("panning");
      }
    });

    // Zoom with mouse wheel
    this.container.addEventListener("wheel", (e) => {
      e.preventDefault();
      const rect = this.container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
      const newScale = Math.min(Math.max(0.25, this.scale * zoomFactor), 2.8);

      // Zoom towards mouse pointer
      this.panX = mouseX - (mouseX - this.panX) * (newScale / this.scale);
      this.panY = mouseY - (mouseY - this.panY) * (newScale / this.scale);
      this.scale = newScale;

      this.updateTransform();
      this.updateZoomBadge();
    }, { passive: false });

    // Touch support for mobile/tablets
    let touchStartX = 0, touchStartY = 0;
    this.container.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1 && !e.target.closest(".mm-dock-btn, .mm-top-pill, .btn")) {
        this.isPanning = true;
        touchStartX = e.touches[0].clientX - this.panX;
        touchStartY = e.touches[0].clientY - this.panY;
      }
    }, { passive: true });

    this.container.addEventListener("touchmove", (e) => {
      if (this.isPanning && e.touches.length === 1) {
        this.panX = e.touches[0].clientX - touchStartX;
        this.panY = e.touches[0].clientY - touchStartY;
        this.updateTransform();
      }
    }, { passive: true });

    this.container.addEventListener("touchend", () => {
      this.isPanning = false;
    });
  }

  initToolbarEvents() {
    // Zoom in
    document.getElementById("btn-mm-zoom-in")?.addEventListener("click", () => {
      this.zoomBy(1.2);
    });

    // Zoom out
    document.getElementById("btn-mm-zoom-out")?.addEventListener("click", () => {
      this.zoomBy(0.83);
    });

    // Reset Zoom
    document.getElementById("btn-mm-zoom-reset")?.addEventListener("click", () => {
      this.scale = 1;
      this.updateTransform();
      this.updateZoomBadge();
    });

    // Recenter / Fit View
    document.getElementById("btn-mm-recenter")?.addEventListener("click", () => {
      this.fitToView();
    });

    // Expand All / Collapse All
    document.getElementById("btn-mm-toggle-all")?.addEventListener("click", () => {
      if (this.collapsedIds.size > 0) {
        this.collapsedIds.clear();
        window.showToast("Expanded all branches", "info");
      } else {
        this.collapseAllSubtrees();
        window.showToast("Collapsed sub-branches", "info");
      }
      this.render();
    });

    // Fullscreen toggle
    document.getElementById("btn-mm-fullscreen")?.addEventListener("click", () => {
      this.toggleFullscreen();
    });

    // Save to library
    document.getElementById("btn-mm-save")?.addEventListener("click", () => {
      this.saveToLibrary();
    });

    // Regenerate
    document.getElementById("btn-mm-regenerate")?.addEventListener("click", () => {
      this.handleGenerate();
    });

    // Export options
    document.getElementById("btn-mm-export-svg")?.addEventListener("click", () => {
      this.exportAsSvg();
    });
    document.getElementById("btn-mm-export-png")?.addEventListener("click", () => {
      this.exportAsPng();
    });
    document.getElementById("btn-mm-export-json")?.addEventListener("click", () => {
      this.exportAsJson();
    });

    // Inspector close button
    document.getElementById("btn-mm-close-inspector")?.addEventListener("click", () => {
      document.getElementById("mm-inspector-panel")?.classList.remove("active");
    });
  }

  initInputControls() {
    const generateBtn = document.getElementById("btn-generate-mindmap");
    const loadDemoBtn = document.getElementById("btn-mm-load-demo");
    const clearBtn = document.getElementById("btn-mm-clear-input");
    const togglePanelBtn = document.getElementById("btn-mm-toggle-input-panel");
    const configPanel = document.getElementById("mm-config-panel");

    const notesTextarea = document.getElementById("mm-source-text");
    const charCounter = document.getElementById("mm-char-count");
    const dropzone = document.getElementById("mm-dropzone");
    const fileInput = document.getElementById("mm-file-input");

    notesTextarea?.addEventListener("input", () => {
      const len = notesTextarea.value.length;
      if (charCounter) charCounter.textContent = `${len.toLocaleString()} / 35,000 characters`;
    });

    if (loadDemoBtn && notesTextarea) {
      loadDemoBtn.addEventListener("click", () => {
        notesTextarea.value = DEMO_WATER_NOTES;
        const topicInput = document.getElementById("mm-topic-input");
        if (topicInput) topicInput.value = "Water Conservation";
        notesTextarea.dispatchEvent(new Event("input"));
        window.showToast("Loaded Water Conservation sample material!", "info");
      });
    }

    if (clearBtn && notesTextarea) {
      clearBtn.addEventListener("click", () => {
        notesTextarea.value = "";
        const topicInput = document.getElementById("mm-topic-input");
        if (topicInput) topicInput.value = "";
        notesTextarea.dispatchEvent(new Event("input"));
        window.showToast("Cleared notes input", "info");
      });
    }

    if (togglePanelBtn && configPanel) {
      togglePanelBtn.addEventListener("click", () => {
        configPanel.classList.toggle("collapsed");
        const isCollapsed = configPanel.classList.contains("collapsed");
        togglePanelBtn.textContent = isCollapsed ? "Show Input Panel ▼" : "Hide Input Panel ▲";
      });
    }

    if (dropzone && fileInput) {
      dropzone.addEventListener("click", () => fileInput.click());
      dropzone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropzone.classList.add("dragover");
      });
      dropzone.addEventListener("dragleave", () => {
        dropzone.classList.remove("dragover");
      });
      dropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropzone.classList.remove("dragover");
        if (e.dataTransfer.files.length > 0) {
          this.handleFile(e.dataTransfer.files[0]);
        }
      });
      fileInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
          this.handleFile(e.target.files[0]);
        }
      });
    }

    if (generateBtn) {
      generateBtn.addEventListener("click", () => {
        this.handleGenerate();
      });
    }
  }

  handleFile(file) {
    const notesTextarea = document.getElementById("mm-source-text");
    const topicInput = document.getElementById("mm-topic-input");
    if (!notesTextarea) return;

    if (topicInput && !topicInput.value) {
      topicInput.value = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
    }

    if (file.type.includes("text") || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        notesTextarea.value = e.target.result;
        notesTextarea.dispatchEvent(new Event("input"));
        window.showToast(`Imported ${file.name}`, "success");
      };
      reader.readAsText(file);
    } else {
      notesTextarea.value = `[Extracted from ${file.name}]\n\n` + DEMO_WATER_NOTES;
      notesTextarea.dispatchEvent(new Event("input"));
      window.showToast(`Imported ${file.name}`, "success");
    }
  }

  async handleGenerate() {
    const topicInput = document.getElementById("mm-topic-input");
    const notesTextarea = document.getElementById("mm-source-text");
    const depthSelect = document.getElementById("mm-depth-select");
    const generateBtn = document.getElementById("btn-generate-mindmap");

    const topic = topicInput?.value.trim() || "";
    const text = notesTextarea?.value.trim() || "";
    const depth = parseInt(depthSelect?.value || "3", 10);

    if (!topic && !text) {
      window.showToast("Enter a topic or study material first.", "error");
      notesTextarea?.focus();
      return;
    }

    const emptyState = document.getElementById("mm-empty-state");
    const loadingState = document.getElementById("mm-loading-state");
    if (emptyState) emptyState.style.display = "none";
    if (loadingState) loadingState.style.display = "flex";

    const loadingText = document.getElementById("mm-loading-step-text");
    const steps = [
      "Analyzing study notes & key hierarchies...",
      "Synthesizing primary themes & branches...",
      "Connecting subtopics & high-yield takeaways...",
      "Rendering organic mind map canvas..."
    ];
    let stepIdx = 0;
    const interval = setInterval(() => {
      if (loadingText && stepIdx < steps.length) {
        loadingText.textContent = steps[stepIdx];
        stepIdx++;
      }
    }, 550);

    if (generateBtn) generateBtn.disabled = true;

    try {
      const data = await window.store.generateMindMap(topic, text, depth);
      clearInterval(interval);
      if (loadingState) loadingState.style.display = "none";

      this.rootData = this.assignIdsAndColors(data);
      this.collapsedIds.clear();
      this.render();
      this.fitToView();

      const titleDisplay = document.getElementById("mm-title-header");
      if (titleDisplay) titleDisplay.textContent = this.rootData.title;

      // Automatically collapse the input panel on mobile/small screens to give maximum canvas space
      if (window.innerWidth < 1024) {
        document.getElementById("mm-config-panel")?.classList.add("collapsed");
        const toggleBtn = document.getElementById("btn-mm-toggle-input-panel");
        if (toggleBtn) toggleBtn.textContent = "Show Input Panel ▼";
      }

      window.showToast(`Mind Map generated! "${this.rootData.title}" ready.`, "success");
    } catch (error) {
      clearInterval(interval);
      if (loadingState) loadingState.style.display = "none";
      if (!this.rootData && emptyState) emptyState.style.display = "flex";
      window.showToast(error.message || "Failed to generate mind map.", "error");
    } finally {
      if (generateBtn) generateBtn.disabled = false;
    }
  }

  assignIdsAndColors(node, path = "0", branchIndex = 0, depth = 0) {
    const id = node.id || `node-${path}`;
    const color = depth === 0 ? "#818cf8" : BRANCH_COLORS[branchIndex % BRANCH_COLORS.length];
    const newNode = {
      ...node,
      id,
      color,
      depth,
      children: []
    };

    if (Array.isArray(node.children)) {
      newNode.children = node.children.map((child, idx) => {
        const nextBranchIdx = depth === 0 ? idx : branchIndex;
        return this.assignIdsAndColors(child, `${path}-${idx}`, nextBranchIdx, depth + 1);
      });
    }

    return newNode;
  }

  collapseAllSubtrees() {
    if (!this.rootData || !this.rootData.children) return;
    this.collapsedIds.clear();
    const recurse = (node) => {
      if (node.depth >= 1 && node.children && node.children.length > 0) {
        this.collapsedIds.add(node.id);
      }
      if (node.children) node.children.forEach(recurse);
    };
    this.rootData.children.forEach(recurse);
  }

  zoomBy(factor) {
    const newScale = Math.min(Math.max(0.25, this.scale * factor), 2.8);
    const containerW = this.container?.clientWidth || 800;
    const containerH = this.container?.clientHeight || 600;

    // Zoom toward center of container
    this.panX = containerW / 2 - (containerW / 2 - this.panX) * (newScale / this.scale);
    this.panY = containerH / 2 - (containerH / 2 - this.panY) * (newScale / this.scale);
    this.scale = newScale;

    this.updateTransform();
    this.updateZoomBadge();
  }

  updateTransform() {
    if (this.viewport) {
      this.viewport.setAttribute("transform", `translate(${this.panX}, ${this.panY}) scale(${this.scale})`);
    }
  }

  updateZoomBadge() {
    const badge = document.getElementById("mm-zoom-level");
    if (badge) badge.textContent = `${Math.round(this.scale * 100)}%`;
  }

  toggleFullscreen() {
    if (!this.container) return;
    this.isFullscreen = !this.isFullscreen;
    this.container.classList.toggle("fullscreen", this.isFullscreen);
    const btn = document.getElementById("btn-mm-fullscreen");
    if (btn) btn.textContent = this.isFullscreen ? "🗗" : "⛶";
    this.fitToView();
  }

  render() {
    if (!this.rootData || !this.viewport) return;

    this.viewport.innerHTML = "";

    // Calculate layout coordinates
    const layout = this.calculateBilateralLayout(this.rootData);

    // Draw Links first (under nodes)
    const linksGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    linksGroup.setAttribute("class", "mm-links-layer");

    layout.links.forEach(link => {
      const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
      pathEl.setAttribute("class", "mm-curve-link");
      pathEl.setAttribute("d", link.d);
      pathEl.setAttribute("stroke", link.color);
      pathEl.setAttribute("stroke-width", link.width || 2.5);
      linksGroup.appendChild(pathEl);
    });

    this.viewport.appendChild(linksGroup);

    // Draw Nodes
    const nodesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    nodesGroup.setAttribute("class", "mm-nodes-layer");

    layout.nodes.forEach(item => {
      const nodeEl = this.createNodeElement(item);
      nodesGroup.appendChild(nodeEl);
    });

    this.viewport.appendChild(nodesGroup);

    // Update count display
    const countBadge = document.getElementById("mm-node-count-badge");
    if (countBadge) countBadge.textContent = `${layout.nodes.length} Concepts`;
  }

  calculateBilateralLayout(root) {
    const nodes = [];
    const links = [];

    // Root dimensions
    const rootTextWidth = this.measureText(root.title, 15, "bold");
    const rootW = Math.max(160, rootTextWidth + 48);
    const rootH = 50;

    const rootNodeItem = {
      data: root,
      x: 0,
      y: 0,
      w: rootW,
      h: rootH,
      type: "root",
      color: "#818cf8"
    };
    nodes.push(rootNodeItem);

    const children = root.children || [];
    if (children.length === 0) {
      return { nodes, links, bounds: { minX: -rootW/2, maxX: rootW/2, minY: -rootH/2, maxY: rootH/2 } };
    }

    // Split into right and left branches (Bilateral radial layout)
    const rightBranches = [];
    const leftBranches = [];

    children.forEach((child, i) => {
      if (i % 2 === 0) {
        rightBranches.push(child);
      } else {
        leftBranches.push(child);
      }
    });

    // Helper for tree sizing
    const computeSubtreeHeight = (node) => {
      if (this.collapsedIds.has(node.id) || !node.children || node.children.length === 0) {
        return node.depth === 1 ? 72 : 44;
      }
      let h = 0;
      node.children.forEach(c => {
        h += computeSubtreeHeight(c);
      });
      return Math.max(node.depth === 1 ? 72 : 44, h);
    };

    // Layout right hemisphere (+X)
    this.layoutHemisphere(rightBranches, 1, rootNodeItem, nodes, links, computeSubtreeHeight);

    // Layout left hemisphere (-X)
    this.layoutHemisphere(leftBranches, -1, rootNodeItem, nodes, links, computeSubtreeHeight);

    // Compute bounding box
    let minX = -rootW / 2, maxX = rootW / 2, minY = -rootH / 2, maxY = rootH / 2;
    nodes.forEach(n => {
      minX = Math.min(minX, n.x - n.w / 2);
      maxX = Math.max(maxX, n.x + n.w / 2);
      minY = Math.min(minY, n.y - n.h / 2);
      maxY = Math.max(maxY, n.y + n.h / 2);
    });

    return { nodes, links, bounds: { minX, maxX, minY, maxY } };
  }

  layoutHemisphere(branches, direction, rootItem, nodes, links, computeHeight) {
    if (branches.length === 0) return;

    // Calculate total vertical space needed for this hemisphere
    const branchHeights = branches.map(b => computeHeight(b));
    const totalH = branchHeights.reduce((acc, v) => acc + v, 0);

    let startY = -totalH / 2;
    const horizontalDistance = 240;

    branches.forEach((branch, idx) => {
      const bh = branchHeights[idx];
      const branchY = startY + bh / 2;
      startY += bh;

      const textW = this.measureText(branch.title, 13.5, "600");
      const branchW = Math.max(140, textW + 36);
      const branchH = 42;
      const branchX = direction * (rootItem.w / 2 + horizontalDistance);

      const branchNodeItem = {
        data: branch,
        x: branchX,
        y: branchY,
        w: branchW,
        h: branchH,
        type: "branch",
        color: branch.color,
        direction
      };
      nodes.push(branchNodeItem);

      // Connect Root -> Branch
      const rootAnchorX = direction > 0 ? rootItem.w / 2 : -rootItem.w / 2;
      const branchAnchorX = direction > 0 ? branchX - branchW / 2 : branchX + branchW / 2;

      links.push({
        d: this.createCubicBezier(rootAnchorX, 0, branchAnchorX, branchY, direction),
        color: branch.color,
        width: 3
      });

      // Recurse children of this branch if not collapsed
      if (!this.collapsedIds.has(branch.id) && branch.children && branch.children.length > 0) {
        this.layoutSubtree(branch.children, branchNodeItem, direction, nodes, links, computeHeight);
      }
    });
  }

  layoutSubtree(children, parentItem, direction, nodes, links, computeHeight) {
    const childHeights = children.map(c => computeHeight(c));
    const totalSubH = childHeights.reduce((acc, v) => acc + v, 0);

    let curY = parentItem.y - totalSubH / 2;
    const subHorizDist = 180;

    children.forEach((child, idx) => {
      const ch = childHeights[idx];
      const childY = curY + ch / 2;
      curY += ch;

      const textW = this.measureText(child.title, 12, "500");
      const childW = Math.max(110, textW + 28);
      const childH = 32;
      const childX = parentItem.x + direction * (parentItem.w / 2 + subHorizDist);

      const childNodeItem = {
        data: child,
        x: childX,
        y: childY,
        w: childW,
        h: childH,
        type: "leaf",
        color: child.color,
        direction
      };
      nodes.push(childNodeItem);

      // Connect Parent -> Child
      const pAnchorX = direction > 0 ? parentItem.x + parentItem.w / 2 : parentItem.x - parentItem.w / 2;
      const cAnchorX = direction > 0 ? childX - childW / 2 : childX + childW / 2;

      links.push({
        d: this.createCubicBezier(pAnchorX, parentItem.y, cAnchorX, childY, direction),
        color: child.color,
        width: 2
      });

      if (!this.collapsedIds.has(child.id) && child.children && child.children.length > 0) {
        this.layoutSubtree(child.children, childNodeItem, direction, nodes, links, computeHeight);
      }
    });
  }

  createCubicBezier(x1, y1, x2, y2, direction) {
    const dx = Math.abs(x2 - x1);
    const cp1x = x1 + direction * (dx * 0.52);
    const cp2x = x2 - direction * (dx * 0.48);
    return `M ${x1} ${y1} C ${cp1x} ${y1}, ${cp2x} ${y2}, ${x2} ${y2}`;
  }

  createNodeElement(item) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", `mm-node mm-node-${item.type}`);
    g.setAttribute("transform", `translate(${item.x}, ${item.y})`);

    // Pill background rect
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", -item.w / 2);
    rect.setAttribute("y", -item.h / 2);
    rect.setAttribute("width", item.w);
    rect.setAttribute("height", item.h);
    rect.setAttribute("stroke", item.color);
    g.appendChild(rect);

    // Text label
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", 0);
    text.setAttribute("y", 0);
    text.textContent = item.data.title;
    g.appendChild(text);

    // Interactive Expand/Collapse Toggle Button for branches with children
    const hasChildren = item.data.children && item.data.children.length > 0;
    if (hasChildren && item.type !== "root") {
      const isCollapsed = this.collapsedIds.has(item.data.id);
      const toggleG = document.createElementNS("http://www.w3.org/2000/svg", "g");
      toggleG.setAttribute("class", "mm-toggle-circle");
      
      const toggleX = item.direction > 0 ? item.w / 2 + 10 : -item.w / 2 - 10;
      toggleG.setAttribute("transform", `translate(${toggleX}, 0)`);

      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("r", 8);
      circle.setAttribute("fill", isCollapsed ? item.color : "rgba(15, 23, 42, 0.9)");
      circle.setAttribute("stroke", item.color);
      circle.setAttribute("stroke-width", 1.8);
      toggleG.appendChild(circle);

      const sign = document.createElementNS("http://www.w3.org/2000/svg", "text");
      sign.setAttribute("x", 0);
      sign.setAttribute("y", 1);
      sign.setAttribute("text-anchor", "middle");
      sign.setAttribute("dominant-baseline", "central");
      sign.setAttribute("font-size", "11px");
      sign.setAttribute("font-weight", "bold");
      sign.setAttribute("fill", isCollapsed ? "#ffffff" : item.color);
      sign.textContent = isCollapsed ? "+" : "−";
      toggleG.appendChild(sign);

      toggleG.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.collapsedIds.has(item.data.id)) {
          this.collapsedIds.delete(item.data.id);
        } else {
          this.collapsedIds.add(item.data.id);
        }
        this.render();
      });

      g.appendChild(toggleG);
    }

    // Node click: select and open concept inspector
    g.addEventListener("click", (e) => {
      e.stopPropagation();
      this.selectNode(item);
    });

    return g;
  }

  selectNode(item) {
    this.selectedNode = item;
    const inspector = document.getElementById("mm-inspector-panel");
    const titleEl = document.getElementById("mm-inspect-title");
    const notesEl = document.getElementById("mm-inspect-notes");
    const depthEl = document.getElementById("mm-inspect-depth");

    if (inspector && titleEl) {
      titleEl.textContent = item.data.title;
      if (depthEl) {
        depthEl.textContent = item.type === "root" ? "Central Root" : `Level ${item.data.depth} Subtopic`;
      }
      if (notesEl) {
        notesEl.textContent = item.data.notes || `Part of the "${this.rootData.title}" study structure. Explore related subtopics or add annotations.`;
      }
      inspector.classList.add("active");
    }
  }

  measureText(str, fontSize = 13, weight = "normal") {
    const canvas = this.measureCanvas || (this.measureCanvas = document.createElement("canvas"));
    const ctx = canvas.getContext("2d");
    ctx.font = `${weight} ${fontSize}px system-ui, -apple-system, sans-serif`;
    return Math.min(220, ctx.measureText(str || "").width);
  }

  fitToView() {
    if (!this.rootData || !this.container) return;

    const layout = this.calculateBilateralLayout(this.rootData);
    const bounds = layout.bounds;
    const graphW = bounds.maxX - bounds.minX + 120;
    const graphH = bounds.maxY - bounds.minY + 120;

    const containerW = this.container.clientWidth || 800;
    const containerH = this.container.clientHeight || 600;

    const scaleX = containerW / graphW;
    const scaleY = containerH / graphH;
    this.scale = Math.min(Math.max(0.35, Math.min(scaleX, scaleY) * 0.88), 1.6);

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    this.panX = containerW / 2 - centerX * this.scale;
    this.panY = containerH / 2 - centerY * this.scale;

    this.updateTransform();
    this.updateZoomBadge();
  }

  async saveToLibrary() {
    if (!this.rootData) {
      window.showToast("Generate a mind map first before saving.", "error");
      return;
    }

    const title = this.rootData.title || "Study Mind Map";
    const currentId = new URLSearchParams(window.location.search).get("id");
    const newMindMapItem = {
      id: currentId || `mindmap-${Date.now()}`,
      type: "mindmap",
      title: title,
      category: "Mind Map",
      date: "Today",
      progress: 100,
      isFavorite: false,
      rootNode: this.rootData,
      nodeCount: this.countTotalNodes(this.rootData),
      tags: ["Mind Map", "Visual Notes"]
    };

    const saveBtn = document.getElementById("btn-mm-save");
    if (saveBtn) saveBtn.disabled = true;

    try {
      const saved = await window.store.saveItem(newMindMapItem);
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set("id", saved.id);
      window.history.replaceState({}, "", nextUrl.toString());
      window.showToast("Mind map saved to your Library!", "success");

      try {
        await window.store.addActivity({
          title,
          type: "Generated Mind Map",
          score: `${saved.nodeCount || 1} Concepts`,
          icon: "🕸"
        });
      } catch (_e) {
        // Activity recording is non-blocking
      }
    } catch (error) {
      window.showToast(error.message || "Failed to save mind map.", "error");
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  }

  countTotalNodes(node) {
    if (!node) return 0;
    let count = 1;
    if (Array.isArray(node.children)) {
      node.children.forEach(c => {
        count += this.countTotalNodes(c);
      });
    }
    return count;
  }

  exportAsSvg() {
    if (!this.rootData) return;
    const layout = this.calculateBilateralLayout(this.rootData);
    const bounds = layout.bounds;
    const padding = 60;
    const width = bounds.maxX - bounds.minX + padding * 2;
    const height = bounds.maxY - bounds.minY + padding * 2;

    const svgClone = this.svg.cloneNode(true);
    svgClone.setAttribute("viewBox", `${bounds.minX - padding} ${bounds.minY - padding} ${width} ${height}`);
    svgClone.setAttribute("width", width);
    svgClone.setAttribute("height", height);

    // Embed essential styles inline for standalone SVG viewer
    const styleEl = document.createElement("style");
    styleEl.textContent = `
      text { font-family: system-ui, -apple-system, sans-serif; }
      .mm-node-root rect { fill: #1e293b; stroke: #818cf8; stroke-width: 2.5px; rx: 22px; }
      .mm-node-root text { fill: #ffffff; font-weight: 700; font-size: 15px; }
      .mm-node-branch rect { fill: #0f172a; stroke-width: 2px; rx: 16px; }
      .mm-node-branch text { fill: #f8fafc; font-weight: 600; font-size: 13.5px; }
      .mm-node-leaf rect { fill: #182036; stroke-width: 1.5px; rx: 10px; }
      .mm-node-leaf text { fill: #cbd5e1; font-weight: 500; font-size: 12px; }
      .mm-curve-link { fill: none; stroke-linecap: round; }
    `;
    svgClone.prepend(styleEl);

    // Reset viewport transform for clean exported canvas
    const viewportClone = svgClone.querySelector("#mindmap-viewport");
    if (viewportClone) viewportClone.removeAttribute("transform");

    const svgData = new XMLSerializer().serializeToString(svgClone);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    this.downloadFile(url, `${(this.rootData.title || "mindmap").replace(/\s+/g, "_")}.svg`);
    window.showToast("Exported vector SVG!", "success");
  }

  exportAsPng() {
    if (!this.rootData) return;
    const layout = this.calculateBilateralLayout(this.rootData);
    const bounds = layout.bounds;
    const padding = 80;
    const width = Math.max(800, bounds.maxX - bounds.minX + padding * 2);
    const height = Math.max(600, bounds.maxY - bounds.minY + padding * 2);

    const svgClone = this.svg.cloneNode(true);
    svgClone.setAttribute("viewBox", `${bounds.minX - padding} ${bounds.minY - padding} ${width} ${height}`);
    svgClone.setAttribute("width", width);
    svgClone.setAttribute("height", height);

    const viewportClone = svgClone.querySelector("#mindmap-viewport");
    if (viewportClone) viewportClone.removeAttribute("transform");

    const svgString = new XMLSerializer().serializeToString(svgClone);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width * 2; // High-DPI 2x
      canvas.height = height * 2;
      const ctx = canvas.getContext("2d");
      ctx.scale(2, 2);

      // Fill background
      ctx.fillStyle = "#080C1A";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(image, 0, 0);

      URL.revokeObjectURL(url);
      const pngUrl = canvas.toDataURL("image/png");
      this.downloadFile(pngUrl, `${(this.rootData.title || "mindmap").replace(/\s+/g, "_")}.png`);
      window.showToast("Exported high-res PNG image!", "success");
    };
    image.src = url;
  }

  exportAsJson() {
    if (!this.rootData) return;
    const jsonString = JSON.stringify(this.rootData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    this.downloadFile(url, `${(this.rootData.title || "mindmap").replace(/\s+/g, "_")}.json`);
    window.showToast("Exported JSON structure!", "info");
  }

  downloadFile(url, filename) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    const passedTopic = params.get("topic");

    if (id) {
      const item = window.store.getItemById(id);
      if (item && item.type === "mindmap" && item.rootNode) {
        this.rootData = item.rootNode;
        this.render();
        this.fitToView();
        const titleDisplay = document.getElementById("mm-title-header");
        if (titleDisplay) titleDisplay.textContent = this.rootData.title;
        window.showToast(`Loaded "${item.title}" from Library`, "info");
        return;
      }
    }

    if (passedTopic) {
      const topicInput = document.getElementById("mm-topic-input");
      if (topicInput) topicInput.value = decodeURIComponent(passedTopic);

      const cachedPrepText = sessionStorage.getItem("cogni_prep_mindmap_text");
      if (cachedPrepText) {
        const notesTextarea = document.getElementById("mm-source-text");
        if (notesTextarea) {
          notesTextarea.value = cachedPrepText;
          notesTextarea.dispatchEvent(new Event("input"));
        }
        sessionStorage.removeItem("cogni_prep_mindmap_text");
      }
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.mindMapApp = new MindMapApp();
  window.mindMapApp.init();
});
