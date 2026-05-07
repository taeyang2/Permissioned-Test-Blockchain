# Content Lineage - AI 콘텐츠 진위 검증 시스템 PoC

Hyperledger Besu 퍼미션드 블록체인을 활용한 AI 생성 콘텐츠 진위 검증 시스템 PoC입니다.  
C2PA Manifest를 블록체인에 앵커링하여 딥페이크 등 AI 생성 콘텐츠의 출처와 무결성을 검증합니다.

## 프로젝트 구조

```
content_lineage/
├── contracts/                          # Hardhat 프로젝트
│   ├── contracts/
│   │   ├── ContentAccessControl.sol    # 역할 기반 접근 제어 (ACL)
│   │   ├── RegistrarRegistry.sol       # Registrar 관리
│   │   └── ContentRegistry.sol         # 콘텐츠 해시 등록
│   ├── ignition/
│   │   ├── modules/ContentLineage.ts   # Ignition 배포 모듈
│   │   └── deployments/chain-1337/     # besu_local 배포 상태
│   └── test/
│       └── ContentRegistry.ts          # 통합 테스트
└── permissioned_network/               # Besu 네트워크 인프라
    ├── config/
    │   ├── besu/                       # genesis.json, config.toml, permissions_config.toml
    │   └── nodes/                      # 노드 키 (공개키만 커밋)
    ├── docker-compose.yml
    └── run.sh / stop.sh / resume.sh    # 네트워크 관리 스크립트
```

## 기술 스택

- **Hyperledger Besu 23.4.1** — QBFT 합의 퍼미션드 블록체인
- **Hardhat v3.4.2** + **TypeScript**
- **Hardhat Ignition** — 스마트 컨트랙트 배포
- **viem** — 컨트랙트 인터랙션
- **OpenZeppelin v5** — AccessControl

## 네트워크 설정

| 네트워크 | 용도 | RPC | ChainId |
|---|---|---|---|
| besu_local | Besu QBFT 로컬 (PoC) | http://localhost:8545 | 1337 |

### 노드 구성

| 역할 | 수량 | IP 대역 |
|---|---|---|
| Validator | 4 | 172.16.239.11~14 |
| RPC Node | 1 | 172.16.239.15 |
| Member | 3 | 172.16.239.16~18 |

## 배포된 컨트랙트 주소 (besu_local, chainId 1337)

| 컨트랙트 | 주소 |
|---|---|
| ContentAccessControl | `0xa50a51c09a5c451C52BB714527E1974b686D8e77` |
| RegistrarRegistry | `0x9a3DBCa554e9f6b9257aAa24010DA8377C57c17e` |
| ContentRegistry | `0x9B8397f1B0FEcD3a1a40CdD5E8221Fa461898517` |

- **배포자 (Admin EOA):** `0xfe3b557e8fb62b89f4916b721be55ceb828dbd73`
- **초기 Registrar:** DigiCAP

## 주요 주의사항

Besu 23.4.1은 London 하드포크까지만 지원합니다 (Shanghai, Cancun 미지원).  
Solidity 0.8.28의 기본 evmVersion은 `cancun`이므로, 반드시 `hardhat.config.ts`에 명시해야 합니다.

```typescript
solidity: {
  profiles: {
    default: {
      version: "0.8.28",
      settings: {
        evmVersion: "london",
      },
    },
  },
},
```

파일 기반 퍼미셔닝(`permissions_config.toml`) 사용 시, `perm_addAccountsToAllowlist`를 rpcnode에만 호출하면 validator들의 in-memory 상태가 갱신되지 않습니다.  
각 validator(172.16.239.11~14)에 직접 호출해야 합니다.

## 실행 방법

### 1. 네트워크 시작

```bash
cd permissioned_network
./run.sh
```

### 2. Hardhat keystore에 배포자 키 등록

```bash
cd contracts
npx hardhat keystore set BESU_DEPLOYER_KEY
# private key: 0x8f2a5...
```

### 3. 컨트랙트 배포

```bash
npx hardhat compile
npx hardhat ignition deploy ignition/modules/ContentLineage.ts --network besu_local
```

### 4. 테스트 실행

```bash
npx hardhat test
```

## Block Explorer

| 서비스 | URL |
|---|---|
| Quorum Explorer | http://localhost:25000 |
| Grafana | http://localhost:3001 |
| Prometheus | http://localhost:9090 |

## 전체 플로우

```
1. Registrar가 콘텐츠 해시 등록
   ContentRegistry.registerContent(contentHash, registrar)
        ↓
2. 온체인 이벤트로 등록 이력 조회
   ContentRegistry.getContent(contentHash)
        ↓
3. 역할 기반 접근 제어로 Registrar 관리
   RegistrarRegistry.addRegistrar(address, name)
```
