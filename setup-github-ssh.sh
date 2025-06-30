#!/bin/bash

echo "=== GitHub SSH 配置指南 ==="
echo
echo "1. 生成SSH密钥（如果还没有）:"
echo "   ssh-keygen -t ed25519 -C 'ay2494@nyu.edu'"
echo "   按回车接受默认路径，可以设置密码或留空"
echo
echo "2. 启动ssh-agent并添加密钥:"
echo "   eval \"\$(ssh-agent -s)\""
echo "   ssh-add ~/.ssh/id_ed25519"
echo
echo "3. 复制公钥内容:"
echo "   cat ~/.ssh/id_ed25519.pub"
echo
echo "4. 添加到GitHub:"
echo "   - 访问 https://github.com/settings/keys"
echo "   - 点击 'New SSH key'"
echo "   - 粘贴公钥内容"
echo
echo "5. 修改远程仓库URL为SSH:"
echo "   cd '/Users/annanyang/Downloads/Prototype and test/Class notebook/class-notebook'"
echo "   git remote set-url origin git@github.com:An9Yang/class-notebook.git"
echo
echo "6. 测试连接:"
echo "   ssh -T git@github.com"
echo
echo "完成后就可以正常push了！"