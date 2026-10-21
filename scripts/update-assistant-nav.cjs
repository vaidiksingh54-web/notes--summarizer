const fs = require('fs');
const path = require('path');

function updateFolder(baseDir) {
  const htmlFiles = [
    'dashboard.html',
    'library.html',
    'notes.html',
    'mindmap.html',
    'flashcards.html',
    'quiz.html',
    'profile.html',
    'help.html'
  ];

  for (const filename of htmlFiles) {
    const filePath = path.join(baseDir, 'frontend', filename);
    if (!fs.existsSync(filePath)) continue;

    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Add AI Assistant to navbar if missing
    if (!content.includes('nav-link-assistant')) {
      // Find AI Quiz link in navbar
      content = content.replace(
        /(<li><a href="quiz\.html" class="nav-link[^"]*">AI Quiz<\/a><\/li>)/i,
        '$1\n        <li><a href="javascript:void(0)" class="nav-link nav-link-assistant" onclick="window.openAiAssistant && window.openAiAssistant()" title="Open AI Study Assistant">✦ AI Assistant</a></li>'
      );
    }

    // 2. Add AI Assistant to + Create dropdown if missing
    if (!content.includes('AI Study Assistant') && content.includes('id="dropdown-create-menu"')) {
      content = content.replace(
        /(<div id="dropdown-create-menu" class="dropdown-menu right-aligned">\s*)/i,
        '$1<a href="javascript:void(0)" class="dropdown-item" onclick="window.openAiAssistant && window.openAiAssistant()"><span>✦</span> AI Study Assistant</a>\n            '
      );
    }

    // 3. Add AI Assistant to sidebar if missing
    if (!content.includes('sidebar-item-assistant')) {
      content = content.replace(
        /(<div class="sidebar-heading">STUDY TOOLS<\/div>\s*)/i,
        '$1<a href="javascript:void(0)" class="sidebar-item sidebar-item-assistant" onclick="window.openAiAssistant && window.openAiAssistant()"><span style="color: #a855f7;">✦</span> AI Assistant</a>\n        '
      );
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated navbar/sidebar in ${filePath}`);
  }
}

// Run for both main downloads folder and worktree
updateFolder('C:/Users/HP/Downloads/cognistudy-ai---smart-ai-study-assistant');
updateFolder('C:/Users/HP/.gemini/antigravity/worktrees/cognistudy-ai---smart-ai-study-assistant/repair_cognistudy_end_to_end');
console.log('All navigation files updated successfully.');

