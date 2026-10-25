/**
 * Flying Cheetah - Flowchart Video Animation Console Controller
 * High-performance 60fps auto-stepping engine with interactive controls
 */

class FlowchartConsolePlayer {
    constructor(config) {
        this.config = Object.assign({
            id: 'fcPlayer',
            activeGlowClass: 'node-glow-active',
            stepDuration: 3000, // 3 seconds per step
            steps: [],
            onStepChange: null
        }, config);

        this.currentStep = 0;
        this.isPlaying = true;
        this.progress = 0;
        this.lastTime = null;
        this.animFrameId = null;

        // Elements
        this.progressBar = document.getElementById(this.config.progressBarId);
        this.beam = document.getElementById(this.config.beamId);
        this.stepBadge = document.getElementById(this.config.stepBadgeId);
        this.statusText = document.getElementById(this.config.statusTextId);
        this.playPauseIcon = document.getElementById(this.config.playPauseIconId);
        this.nodeElements = this.config.nodeIds.map(id => document.getElementById(id));

        this.init();
    }

    init() {
        if (!this.nodeElements[0]) return;
        this.applyStep(0);
        this.startLoop();
    }

    startLoop() {
        this.lastTime = performance.now();
        const tick = (now) => {
            const dt = now - this.lastTime;
            this.lastTime = now;

            if (this.isPlaying && this.config.steps.length > 0) {
                const totalSteps = this.config.steps.length;
                this.progress += (dt / (this.config.stepDuration * totalSteps)) * 100;
                
                if (this.progress >= 100) {
                    this.progress = 0;
                    this.setStep(0);
                } else {
                    const stepIndex = Math.floor((this.progress / 100) * totalSteps);
                    if (stepIndex !== this.currentStep && stepIndex < totalSteps) {
                        this.setStep(stepIndex);
                    }
                }

                if (this.progressBar) {
                    this.progressBar.style.width = this.progress.toFixed(1) + '%';
                }
            }

            this.animFrameId = requestAnimationFrame(tick);
        };
        this.animFrameId = requestAnimationFrame(tick);
    }

    setStep(index) {
        if (index < 0 || index >= this.config.steps.length) return;
        this.currentStep = index;
        this.applyStep(index);
    }

    jumpToStep(index) {
        if (index < 0 || index >= this.config.steps.length) return;
        this.currentStep = index;
        const totalSteps = this.config.steps.length;
        this.progress = (index / totalSteps) * 100;
        if (this.progressBar) {
            this.progressBar.style.width = this.progress.toFixed(1) + '%';
        }
        this.applyStep(index);
    }

    applyStep(index) {
        const step = this.config.steps[index];
        const totalSteps = this.config.steps.length;

        // Beam height calculation (0% to 100%)
        if (this.beam) {
            const beamHeight = totalSteps > 1 ? (index / (totalSteps - 1)) * 100 : 100;
            this.beam.style.height = beamHeight + '%';
        }

        // Node Glow Styling
        this.nodeElements.forEach((node, i) => {
            if (!node) return;
            if (i === index) {
                node.classList.add(this.config.activeGlowClass);
                node.classList.remove('opacity-40');
                node.classList.add('opacity-100');
            } else if (i < index) {
                node.classList.remove(this.config.activeGlowClass);
                node.classList.remove('opacity-40');
                node.classList.add('opacity-90');
            } else {
                node.classList.remove(this.config.activeGlowClass);
                node.classList.add('opacity-40');
                node.classList.remove('opacity-100');
            }
        });

        // Header Chrome Badge
        if (this.stepBadge && step.badge) {
            this.stepBadge.innerText = step.badge;
        }

        // Status bar text
        if (this.statusText && step.status) {
            this.statusText.innerText = step.status;
        }

        // Custom step action callback
        if (typeof this.config.onStepChange === 'function') {
            this.config.onStepChange(index, step);
        }
    }

    togglePlay() {
        this.isPlaying = !this.isPlaying;
        if (this.playPauseIcon) {
            if (this.isPlaying) {
                this.playPauseIcon.className = 'fa-solid fa-pause';
            } else {
                this.playPauseIcon.className = 'fa-solid fa-play';
            }
        }
    }

    restart() {
        this.progress = 0;
        this.setStep(0);
        this.isPlaying = true;
        if (this.playPauseIcon) {
            this.playPauseIcon.className = 'fa-solid fa-pause';
        }
        if (this.progressBar) {
            this.progressBar.style.width = '0%';
        }
    }

    destroy() {
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
        }
    }
}

window.FlowchartConsolePlayer = FlowchartConsolePlayer;
