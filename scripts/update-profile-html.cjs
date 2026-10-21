const fs = require('fs');
const path = require('path');

const cardHtml = `            <div class="glass-card" style="padding: 24px;">
              <h2 style="font-size: 1.15rem; font-weight: 700; color: #fff; margin-bottom: 12px;">Google Calendar Revision Sync</h2>
              <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 16px; line-height: 1.5;">
                CogniStudy AI generates calendar revision blocks with your study topics and summaries.
              </p>
              <button onclick="window.openSafeExternalLink(window.store.generateGoogleCalendarUrl('CogniStudy Active Revision Block', 'Daily 45-min active recall revision session.'))" class="btn btn-secondary btn-sm">
                <span>📅</span> Test Google Calendar Sync
              </button>
            </div>

            <div class="glass-card" style="padding: 24px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
                <h2 style="font-size: 1.15rem; font-weight: 700; color: #fff;">Render Backend API Connection</h2>
                <span id="backend-status-badge" class="badge badge-cyan" style="font-size: 0.75rem;">Detecting...</span>
              </div>
              <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 16px; line-height: 1.5;">
                Connect your Vercel frontend to your live Render backend for Gemini 3.8 Flash AI and database sync.
              </p>
              <div class="form-group" style="margin-bottom: 14px;">
                <label class="form-label" for="input-backend-url" style="display:block; font-size:0.82rem; margin-bottom:6px; color:var(--text-muted);">Render Backend URL</label>
                <input type="url" id="input-backend-url" class="glass-input" placeholder="https://your-backend.onrender.com" style="width: 100%; padding: 10px 14px; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-subtle); color: #fff;">
              </div>
              <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
                <button id="btn-save-backend-url" class="btn btn-primary btn-sm">Save & Connect</button>
                <button id="btn-test-backend-url" class="btn btn-secondary btn-sm">Test Live API</button>
                <button id="btn-reset-backend-url" class="btn btn-ghost btn-sm" style="color: var(--text-faint);">Reset</button>
              </div>
              <div id="backend-test-result" style="margin-top: 12px; font-size: 0.84rem; display: none;"></div>
            </div>`;

function updateProfile(baseDir) {
  const filePath = path.join(baseDir, 'frontend', 'profile.html');
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('Render Backend API Connection')) {
    const calendarMarker = /<div class="glass-card" style="padding: 24px;">\s*<h2 style="font-size: 1\.15rem; font-weight: 700; color: #fff; margin-bottom: 12px;">Google Calendar Revision Sync[\s\S]*?<\/div>/;
    content = content.replace(calendarMarker, cardHtml);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated backend connection card in ${filePath}`);
  }
}

updateProfile('C:/Users/HP/Downloads/cognistudy-ai---smart-ai-study-assistant');
updateProfile('C:/Users/HP/.gemini/antigravity/worktrees/cognistudy-ai---smart-ai-study-assistant/repair_cognistudy_end_to_end');

