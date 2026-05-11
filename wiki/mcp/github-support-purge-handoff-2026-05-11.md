# GitHub Support purge handoff — 2026-05-11

## 목적

`727HC/BMS-Secure-Communication` 저장소의 현재 `master`는 민감정보 정리와 history rewrite가 완료됐지만, GitHub hidden PR refs 2개가 과거 merged PR head를 계속 가리킨다. 이 refs는 owner CLI/API에서 삭제할 수 없으므로 GitHub Support purge가 필요하다.

## 현재 clean 기준

- Clean branch: `refs/heads/master`
- Clean master HEAD: use `git rev-parse origin/master` or `/tmp/github-sensitive-data-purge-request.txt` at submission time
- Repository visibility: private
- Latest sensitive marker workflow: success

## Support에 요청할 대상

- `refs/pull/1/head`
- `refs/pull/2/head`

요청 내용:

- affected pull request refs dereference/delete
- server-side garbage collection
- cached view purge

## 제출 URL

- https://support.github.com/contact/private-information

비로그인 접근은 `/request/landing`으로 이동한다. 브라우저에서 GitHub 계정 `727HC`로 로그인 후 제출한다.

## 붙여넣을 요약문

```text
Repository: 727HC/BMS-Secure-Communication
Clean master HEAD: <paste current `git rev-parse origin/master`>
Affected refs:
- refs/pull/1/head
- refs/pull/2/head

The repository owner already rewrote/amended local history, removed sensitive paths/generated artifacts, replaced sensitive markers with placeholders, force-pushed the cleaned master branch, made the repository private, reduced exposure surfaces, and added CI/local/PR-template guards. A fresh mirror confirms refs/heads/master is clean, but the two GitHub read-only hidden pull request refs still retain old history/metadata. Owner attempts to delete refs/pull/* by git push and REST API are denied because these refs are hidden/read-only.

Please dereference/delete the affected pull request refs, run server-side garbage collection, and remove cached views for the sensitive data.
```

상세 본문은 로컬 임시 파일에도 유지한다.

- `/tmp/github-sensitive-data-purge-request.txt`
- `/tmp/github-support-submit-steps.md`

## 제출 후 완료 확인

```bash
scripts/verify-github-sensitive-clean.sh
# 또는 수동 확인:
git ls-remote origin 'refs/heads/master' 'refs/pull/*'
```

완료 기준:

- `refs/heads/master`만 남는다.
- `refs/pull/1/head`, `refs/pull/2/head`가 사라진다.
- fresh mirror scan에서 `refs/heads/master` known/local/email count 0이 유지된다.

## 현재 대체 방어

- repository private
- Issues/Discussions/Wiki/Projects/Downloads disabled
- Actions default workflow permissions read-only
- Actions artifact/log retention 1 day
- sensitive marker GitHub Actions workflow success
- local pre-commit/pre-push sensitive marker hooks installed
- PR template sensitive-data checklist added

## 남은 리스크

GitHub Support purge 전까지 hidden PR refs는 GitHub server-side에 남는다. 저장소 삭제 후 clean 재생성은 대안이지만 파괴적 작업이므로 명시 승인이 필요하다.
