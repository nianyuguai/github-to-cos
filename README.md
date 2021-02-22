# github-to-cos

使用方法:

### 一、腾讯云配置桶

* 1、腾讯云创建COS存储桶, 访问权限选择: 公有读私有写。例如区域广州(REGION): ap-guangzhou, 桶名(BUCKET): jd-xxxxxx。
* 2、获取桶API访问密钥: 右上角个人-访问管理-访问密钥-API密钥管理。如果第一次创建, 点击新建密钥
获取到 SECRET_ID 和 SECRET_KEY

### 二、Actions配置

* 1、fork项目
* 2、启用actions: Settings中点击Actions, 勾选Allow all actions启用actions
* 2、配置Secret: Settings点击Secrets, New repository secret, 分别填写key和value

|  key   | value  |
|  :----  | :----  |
| SECRET_ID  | AKID********** |
| SECRET_KEY  | hk******* |
| REGION  | ap-guangzhou |
| BUCKET  | jd-xxxxx |

### 三、触发运行
* 1、定时器每4小时跑，有需要自己更改，不建议太频繁
* 2、手动运行，随便编辑一下文件提交可以触发运行
