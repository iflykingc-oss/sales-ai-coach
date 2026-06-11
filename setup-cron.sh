#!/bin/bash
# ============================================
# 定时任务设置脚本
# ============================================
# 使用方法：
# 1. 登录 https://cron-job.org
# 2. 在 Settings > API Keys 中获取 API Key
# 3. 运行此脚本：API_KEY=your_key bash setup-cron.sh

API_KEY="${API_KEY:-}"

if [ -z "$API_KEY" ]; then
    echo "请设置 API_KEY 环境变量"
    echo "获取方法：登录 cron-job.org -> Settings -> API Keys -> Create API Key"
    echo ""
    echo "运行命令：API_KEY=your_key_here bash setup-cron.sh"
    exit 1
fi

API_BASE="https://api.cron-job.org"
HEADERS="-H \"Authorization: Bearer $API_KEY\" -H \"Content-Type: application/json\""

echo "=========================================="
echo "设置定时任务"
echo "=========================================="

# 1. 每日任务 - 每天凌晨0点
echo ""
echo "1. 创建每日清理任务..."
curl -s -X POST "$API_BASE/jobs" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "job": {
      "url": "https://www.aisalecoach.work/api/cron/daily",
      "enabled": true,
      "title": "SalesCoach 每日清理",
      "description": "清理旧用量日志，归档低质量知识",
      "schedule": {
        "timezone": "Asia/Shanghai",
        "hours": [0],
        "mDays": [-1],
        "months": [-1],
        "wDays": [-1],
        "minutes": [3]
      }
    }
  }' | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  ✅ 创建成功: {d.get(\"jobId\", \"unknown\")}')" 2>/dev/null || echo "  ❌ 创建失败"

# 2. 每周任务 - 每周日凌晨2点
echo ""
echo "2. 创建每周聚合任务..."
curl -s -X POST "$API_BASE/jobs" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "job": {
      "url": "https://www.aisalecoach.work/api/cron/weekly",
      "enabled": true,
      "title": "SalesCoach 每周聚合",
      "description": "聚合高分话术和练习到知识库",
      "schedule": {
        "timezone": "Asia/Shanghai",
        "hours": [2],
        "mDays": [-1],
        "months": [-1],
        "wDays": [0],
        "minutes": [7]
      }
    }
  }' | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  ✅ 创建成功: {d.get(\"jobId\", \"unknown\")}')" 2>/dev/null || echo "  ❌ 创建失败"

# 3. 健康检查 - 每5分钟
echo ""
echo "3. 创建健康检查任务..."
curl -s -X POST "$API_BASE/jobs" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "job": {
      "url": "https://www.aisalecoach.work/api/health/detailed",
      "enabled": true,
      "title": "SalesCoach 健康检查",
      "description": "检查API和数据库状态",
      "schedule": {
        "timezone": "Asia/Shanghai",
        "hours": [-1],
        "mDays": [-1],
        "months": [-1],
        "wDays": [-1],
        "minutes": [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]
      }
    }
  }' | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  ✅ 创建成功: {d.get(\"jobId\", \"unknown\")}')" 2>/dev/null || echo "  ❌ 创建失败"

echo ""
echo "=========================================="
echo "设置完成！"
echo "=========================================="
echo ""
echo "查看所有任务："
echo "  访问 https://cron-job.org/en/jobs"
echo ""
echo "定时任务说明："
echo "  - 每日清理：每天 00:03 运行"
echo "  - 每周聚合：每周日 02:07 运行"
echo "  - 健康检查：每 5 分钟运行"
