# Kịch bản demo hệ thống MangaFlow — bám sát chức năng hiện có

## 1. Phạm vi và nguyên tắc của kịch bản

Tài liệu này chỉ mô tả những màn hình, nút bấm và luồng nghiệp vụ đang có trong FE, mobile và backend của hệ thống.

Quy ước trong tài liệu:

- **FE**: ứng dụng web.
- **MB**: ứng dụng mobile.
- **Điều kiện bắt buộc**: nếu chưa thỏa, backend sẽ từ chối thao tác.
- **Giới hạn hiện tại**: giao diện có thể đã hiển thị nhưng thao tác chưa được lưu đầy đủ hoặc chưa được triển khai trên nền tảng đó. Không trình bày phần này như một chức năng đã hoàn thiện.
- Kịch bản chính đi theo nhánh phê duyệt thành công. Các nhánh trả về sửa và ngừng phát hành dùng series demo riêng để không làm hỏng dữ liệu của nhánh chính.

Thời lượng đề xuất:

- Luồng chính: 40–55 phút.
- Luồng mở rộng gồm trả sửa, lịch xuất bản và ngừng phát hành: thêm 20–30 phút.

## 2. Các màn hình thực tế dùng trong demo

| Vai trò | FE | Mobile | Lưu ý |
|---|---|---|---|
| Tất cả tài khoản | Login, Dashboard, Reader Hub, Reading View, Settings, Notifications | Login, Reader Hub, Series detail, Reading View, Notifications, Settings | Reader Hub hiển thị nội dung đã xuất bản. |
| Mangaka | Manage Series, Studio Workspace, Tasks | Tasks, Notifications, Settings, Reader Hub | Manage Series và Studio trên mobile là luồng web-only, không có tab native để sản xuất series. |
| Assistant | Studio Workspace, Tasks | Tasks | Mobile chỉ hỗ trợ quản lý task nhẹ; nộp file sản phẩm đầy đủ nên làm trên FE. |
| Editor | Editor Portal, Manuscript Review/Audit | Editor Portal, Chapter Review | Màn review mobile chỉ hiển thị trang và Approve/Reject; audit, annotation và canvas chi tiết nằm trên FE. |
| Editorial Board | Editorial Board Portal | Publication Control | Mobile có Overview, Assign editor, Votes, Meetings, Rankings, Cancellation và Rubrics. Không cần đi vào Manuscript Review/Audit trong luồng EB mobile. |

### Các màn hình không được mô tả như chức năng mobile hoàn chỉnh

- `Manage Series` và `Studio Workspace` không nằm trong bottom tab mobile.
- Mobile không có canvas sản xuất, upload trang, tạo zone, quản lý layer hoặc quản lý assistant cố định.
- Các thao tác sản xuất phức tạp phải thực hiện trên FE.

## 3. Trạng thái và ràng buộc nền tảng

### 3.1 Series

Luồng chính:

`Draft → Pending_Editor → Pending_EB → Active`

Nhánh trả sửa:

- Editor yêu cầu sửa: `Pending_Editor → Draft`.
- Editorial Board không duyệt: `Pending_EB → Draft`.
- Series bị ngừng phát hành sau biểu quyết: `Active → Cancelled`.

> **Lưu ý:** Luồng thao tác hiện tại trả series về `Draft`; kịch bản không sử dụng trạng thái `Rejected` vì không có bước UI chính nào đưa series sang trạng thái đó.

### 3.2 Chapter

`Draft → Reviewing → Approved → Published`

Các nhánh quay lại:

- Editor yêu cầu sửa chapter: `Reviewing → Draft`.
- Editor đưa chapter đã duyệt về review: `Approved → Reviewing`.
- Editor được phân công hoặc EB Head rút chapter khỏi Reader Hub: `Published → Approved`.

### 3.3 Task

Luồng task mở:

`open → assigned → in_progress → review → done`

Luồng task giao trực tiếp:

`assigned → in_progress → review → done`

Nếu Mangaka yêu cầu sửa:

`review → in_progress`

### 3.4 Điều kiện sản xuất cần nói rõ khi demo

Không nên nói chung rằng “series chưa Active thì không thể giao task”, vì backend hiện có ngoại lệ:

- Có thể tạo và giao task trực tiếp khi series là `Active`.
- Cũng có thể tạo và giao task trực tiếp khi series là `Pending_Editor` **và** Editor được phân công đã bấm Accept, tức `editorStatus = accepted`.
- Task mở cho freelance chỉ xuất hiện với Assistant khi series đã `Active`.
- Task mở loại dedicated chỉ xuất hiện khi series đã `Active` và Assistant thuộc danh sách dedicated của series.
- Màn quản lý dedicated assistants chỉ hiển thị khi series đã `Active`.
- Khi series là `Pending_EB`, Studio bị khóa ở chế độ chỉ xem; không upload trang, sửa canvas, tạo zone hay giao task.
- Khi chapter là `Reviewing`, `Approved` hoặc `Published`, Studio bị khóa đối với Mangaka và Assistant.

## 4. Chuẩn bị dữ liệu trước buổi demo

Chuẩn bị các tài khoản đang hoạt động:

- 01 Mangaka.
- 01–02 Assistant.
- 01 Editor.
- 01 Editorial Board Head có `isEbHead = true`.
- Ít nhất 02 Editorial Board Member khác nếu muốn cuộc họp có tổng cộng 3 người.
- 01 Reader.

Chuẩn bị tài nguyên:

- 01 ảnh cover.
- Ít nhất 01 ảnh trang manga; nên có 3–5 ảnh để màn đọc rõ ràng hơn.
- Nếu demo nộp task bằng file, chuẩn bị file ảnh kết quả cho Assistant.

Chuẩn bị ba series nếu trình diễn đủ nhánh:

1. `Gothic Chronicles` cho nhánh duyệt thành công.
2. `Gothic Chronicles – Revision` cho nhánh Editor/EB yêu cầu sửa.
3. Một series `Active` có chapter `Published` và dữ liệu rating/reaction cho nhánh ranking/cancellation.

> **Không dùng cùng một series cho cả nhánh duyệt, trả sửa và ngừng phát hành.** Mỗi nhánh làm thay đổi trạng thái thật trong database.

## 5. Luồng 1 — Đăng ký, đăng nhập và phân quyền

### 5.1 Tự đăng ký

Thực hiện trên FE hoặc MB.

1. Mở màn hình Login/Register.
2. Chuyển sang form đăng ký.
3. Nhập display name, email và mật khẩu.
4. Chọn một trong ba vai trò được phép tự đăng ký: `mangaka`, `assistant` hoặc `reader`.
5. Nhấn Register.
6. Sau khi thành công, kiểm tra người dùng đã vào ứng dụng theo vai trò của mình.

Điều kiện bắt buộc:

- Mật khẩu tối thiểu 6 ký tự.
- Email chưa được sử dụng.
- Editor và Editorial Board không nằm trong luồng tự đăng ký; phải dùng tài khoản đã được cấp sẵn.

### 5.2 Đăng nhập và phân quyền

1. Đăng xuất.
2. Đăng nhập bằng từng tài khoản demo.
3. Kiểm tra menu/tab thay đổi theo vai trò.
4. Tải lại ứng dụng để xác nhận phiên đăng nhập được khôi phục.

Kết quả cần chỉ ra:

- Reader không vào được Manage Series, Studio, Editor Portal hoặc Editorial Board.
- Mangaka không vào được màn Editor/Editorial Board.
- Editor có Editor Portal.
- Editorial Board có Publication Control.

## 6. Luồng 2 — Hồ sơ và cài đặt

### 6.1 FE Settings

1. Mở `Settings`.
2. Sửa Display name.
3. Nhập Bio.
4. Nhập Avatar URL.
5. Bật hoặc tắt nhận thông báo khi có series mới.
6. Bật hoặc tắt âm thanh thông báo.
7. Nhấn Save.
8. Tải lại trang và xác nhận dữ liệu hồ sơ còn giữ nguyên.

### 6.2 Mobile Settings

1. Mở `Settings` từ Reader Hub.
2. Sửa Display name, Bio và Avatar URL.
3. Nhấn Save changes.
4. Nhấn Language để chuyển Việt/Anh.
5. Cuối luồng, có thể nhấn Logout và xác nhận hộp thoại đăng xuất.

Giới hạn hiện tại trên mobile:

- Các dòng Security, Push notifications và Help & Support hiện chỉ là mục hiển thị, chưa có thao tác cấu hình đi kèm. Không bấm các mục này trong demo như một chức năng hoàn chỉnh.
- Mobile không có form chỉnh skills của Assistant trong màn Settings hiện tại.

## 7. Luồng 3 — Mangaka tạo series và chapter trên FE

### 7.1 Tạo series

Đăng nhập Mangaka trên FE.

1. Mở `Manage Series`.
2. Nhấn tạo series mới.
3. Nhập Title, ví dụ `Gothic Chronicles`.
4. Nhập Description.
5. Chọn ít nhất một tag hợp lệ.
6. Thêm Cover bằng file hoặc URL theo form hiện có.
7. Nếu cần trình diễn, nhập Script hoặc chọn Script file.
8. Nếu cần, thêm Character design bằng các trường đang hiển thị trong form.
9. Nhấn Save.
10. Kiểm tra series được tạo ở trạng thái `Draft`.

Điều kiện bắt buộc:

- Chỉ Mangaka sở hữu series mới sửa hoặc xóa được series đó.
- Phải chọn ít nhất một tag hợp lệ.
- Đây là chức năng FE; không trình diễn tạo series bằng mobile.

### 7.2 Tạo chapter đầu tiên

1. Chọn series vừa tạo.
2. Mở phần Chapters.
3. Nhấn Add chapter.
4. Nhập Chapter number và Title.
5. Lưu chapter.
6. Kiểm tra chapter ở trạng thái `Draft`.

Điều kiện bắt buộc:

- Series phải thuộc Mangaka đang đăng nhập.
- Chapter có thể được tạo khi series là `Draft`, `Active`, hoặc `Pending_Editor` sau khi Editor đã Accept.
- Không thể tạo/sửa chapter khi series đang `Pending_EB`.

### 7.3 Gửi series sang quy trình Editor

1. Tại series `Draft`, nhấn Submit series.
2. Xác nhận thao tác.
3. Kiểm tra trạng thái chuyển thành `Pending_Editor`.

Điều kiện bắt buộc:

- Trong luồng UI này, series phải là `Draft`.
- Series phải có ít nhất một chapter.
- Chỉ Mangaka sở hữu series được Submit.

Kết quả:

- Nếu series chưa có Editor đã nhận từ trước, EB Head nhận thông báo cần phân Editor.
- Series chưa xuất hiện cho Reader và chưa phải `Active`.

## 8. Luồng 4 — EB Head phân Editor

Thực hiện trên mobile `Publication Control` hoặc FE Editorial Board Portal.

1. Đăng nhập bằng EB Head.
2. Mở tab `Assign editor`.
3. Chọn series đang chờ Editor.
4. Nhấn `Choose editor`.
5. Chọn một Editor đang hoạt động.
6. Nhấn `Send invitation`.
7. Kiểm tra series vẫn là `Pending_Editor`, còn trạng thái lời mời là `pending`.

Điều kiện bắt buộc:

- Chỉ tài khoản Editorial Board có `isEbHead = true` mới phân Editor.
- Editor được chọn phải có role `editor` và đang active.
- Series phải ở `Pending_Editor`.

Kết quả:

- Editor nhận notification lời mời.
- Mangaka chưa thể quản lý dedicated assistant vì series chưa `Active`.
- Studio vẫn khóa cho tới khi Editor bấm Accept.

## 9. Luồng 5 — Editor nhận hoặc từ chối lời mời

Thực hiện trên mobile Editor Portal hoặc FE Editor Portal.

### 9.1 Nhánh Accept dùng cho luồng chính

1. Đăng nhập Editor.
2. Mở `Editor Portal`.
3. Tại phần Invitations, chọn series.
4. Nhấn `Accept`.
5. Kiểm tra `editorStatus` chuyển từ `pending` sang `accepted`.

Kết quả quan trọng:

- Series vẫn là `Pending_Editor`.
- Từ thời điểm này Mangaka có thể sản xuất chapter, upload trang, tạo task trực tiếp và gửi chapter review.

### 9.2 Nhánh Decline dùng series phụ

1. Tại lời mời của series phụ, nhấn `Decline`.
2. Kiểm tra Editor được gỡ khỏi series và `editorStatus` trở về `none`.
3. EB Head quay lại Assign editor để mời Editor khác.

Điều kiện bắt buộc:

- Chỉ đúng Editor được mời mới Accept hoặc Decline.
- Lời mời phải còn ở trạng thái `pending` và series còn `Pending_Editor`.

## 10. Luồng 6 — Sản xuất chapter và quản lý task

Luồng tạo trang, canvas, zone, layer và task thực hiện trên FE `Studio Workspace`.

### 10.1 Upload trang và thao tác Studio

1. Đăng nhập Mangaka trên FE.
2. Mở `Studio Workspace`.
3. Chọn series `Pending_Editor` đã được Editor Accept.
4. Chọn chapter `Draft`.
5. Upload ít nhất một ảnh trang.
6. Chọn một trang để mở workspace.
7. Nếu cần trình diễn công cụ, sử dụng các công cụ đang có: select/pan, zone, draw và text.
8. Có thể thêm standalone layer và sắp xếp layer theo giao diện hiện có.

Điều kiện bắt buộc:

- Series phải là `Active` hoặc `Pending_Editor` với Editor đã Accept.
- Chapter phải đang mở cho sản xuất; chapter `Reviewing`, `Approved` hoặc `Published` bị khóa với Mangaka/Assistant.
- Series `Pending_EB` bị khóa toàn bộ phần chỉnh sửa Studio.

### 10.2 Tạo task trực tiếp cho Assistant

1. Từ trang/chapter đang chọn, mở form Create task.
2. Chọn mức giao việc `page` hoặc `chapter`.
3. Nhập Title, Description, Type và Deadline theo form.
4. Chọn Assistant active để giao trực tiếp.
5. Nếu là page task, chọn đúng page hiện tại.
6. Nhấn Assign/Create.
7. Kiểm tra task ở trạng thái `assigned`.

Điều kiện bắt buộc:

- Người nhận phải là tài khoản `assistant` đang active.
- Page task bắt buộc có `pageId` thuộc đúng chapter.
- Không thể tạo chapter-level task nếu chapter đang có page-level task chưa `done`.
- Không thể tạo page-level task nếu chapter đang có chapter-level task chưa `done`.
- Không thể có hai task active trùng phạm vi page.
- Nếu không chọn người nhận, task được tạo ở trạng thái `open`.

### 10.3 Phân biệt task trực tiếp, freelance và dedicated

- Task đã giao trực tiếp cho Assistant vẫn hiển thị cho người đó kể cả series chưa `Active`, miễn task đã được tạo hợp lệ trong giai đoạn `Pending_Editor + accepted`.
- Open freelance task chỉ xuất hiện trong kho của Assistant khi series đã `Active`.
- Open dedicated task chỉ xuất hiện khi series đã `Active` và Assistant đã thuộc dedicated team.
- Vì vậy, trong luồng trước khi EB duyệt, hãy giao task trực tiếp; không dùng kho open/dedicated để minh họa.

### 10.4 Assistant xử lý task trên mobile

Đăng nhập Assistant trên mobile.

1. Mở tab `Tasks`.
2. Dùng các tab All, Open, Progress, Review và Completed để lọc.
3. Với task `open`, nhấn Accept để nhận task.
4. Với task `assigned`, nhấn nút bắt đầu làm để chuyển sang `in_progress`.
5. Với task `in_progress`, mở Submit result.
6. Xác nhận gửi để chuyển task sang `review`.
7. Quan sát task ở tab Review với trạng thái chờ Mangaka duyệt.

Giới hạn hiện tại trên mobile:

- Submit result trên mobile hiện chỉ chuyển trạng thái thật sang `review`; chưa chọn và upload file sản phẩm.
- Nếu buổi demo cần chứng minh file kết quả/layer được lưu và hiển thị cho Mangaka, Assistant phải nộp bằng FE Tasks/Studio.
- Mobile hiện không có thao tác Decline task.

### 10.5 Assistant nộp sản phẩm đầy đủ trên FE

1. Đăng nhập Assistant trên FE.
2. Mở `Tasks`.
3. Nhận task mở hoặc mở task đã được giao.
4. Chuyển task sang `in_progress`.
5. Với page task, chọn file ảnh kết quả và Submit.
6. Với chapter task, gắn file cho đúng từng page rồi finalize submission.
7. Kiểm tra task chuyển sang `review` và Mangaka nhận notification.

### 10.6 Mangaka review kết quả task trên FE

1. Mangaka mở Studio và chọn task ở trạng thái `review`.
2. Xem file sản phẩm đã nộp.
3. Chọn một trong hai nhánh:
   - Chấp nhận: chuyển task sang `done`.
   - Yêu cầu sửa: nhập Review notes và đưa task về `in_progress`.
4. Nếu yêu cầu sửa, Assistant mở lại task, đọc notes và nộp lại.

Điều kiện bắt buộc:

- Chỉ Mangaka giao task mới được duyệt kết quả.
- Mangaka chỉ chuyển `review → done` hoặc `review → in_progress`.
- Assistant chỉ chuyển `assigned → in_progress` và `in_progress → review`.

### 10.7 Dedicated assistants sau khi series Active

Phần này thực hiện sau Luồng 13.

1. Mangaka mở `Manage Series` trên FE.
2. Chọn series đã `Active`.
3. Mở phần Assistants.
4. Tìm Assistant bằng từ khóa.
5. Thêm hoặc gỡ Assistant khỏi dedicated team.

Điều kiện bắt buộc:

- Series phải là `Active`; khi chưa Active, phần quản lý dedicated assistants không được dùng.
- Tài khoản được thêm phải là Assistant phù hợp trong kết quả tìm kiếm.

## 11. Luồng 7 — Mangaka gửi chapter cho Editor review

Thực hiện trên FE Studio.

1. Chọn chapter `Draft` đã có trang.
2. Nhấn Submit chapter for review.
3. Trong hộp thoại, chọn các assistant layer/standalone layer cần ghép cho từng page.
4. Xác nhận Submit.
5. Kiểm tra chapter chuyển `Draft → Reviewing`.

Điều kiện bắt buộc:

- Chỉ Mangaka được Submit chapter review.
- Series phải là `Active` hoặc `Pending_Editor` với Editor đã Accept.
- Chapter phải có ít nhất một page.
- Khi chapter chuyển sang `Reviewing`, Mangaka và Assistant chỉ xem, không tiếp tục chỉnh sửa Studio.

## 12. Luồng 8 — Editor review chapter

### 12.1 Review nhanh trên mobile

1. Đăng nhập Editor trên mobile.
2. Mở `Editor Portal`.
3. Trong danh sách Drafts/chapters chờ review, chọn chapter.
4. Màn `Chapter Review` hiển thị các ảnh trang.
5. Nhấn `Approve` để chuyển `Reviewing → Approved`.

Nhánh phụ:

1. Với chapter demo khác đang `Reviewing`, nhấn `Reject`.
2. Chapter quay về `Draft` để Mangaka sửa và gửi lại.

Giới hạn của màn mobile:

- Màn này chỉ xem danh sách ảnh trang và ra quyết định Approve/Reject.
- Không có annotation pin, canvas audit, resolve annotation hoặc so sánh layer chi tiết như FE.

### 12.2 Review chi tiết trên FE nếu cần trình diễn

1. Mở `Editor Portal` trên FE.
2. Chọn chapter `Reviewing`.
3. Mở `Manuscript Review/Audit`.
4. Duyệt từng page, original/processed view và canvas.
5. Thêm annotation/pin tại vị trí cần góp ý nếu dùng nhánh trả sửa.
6. Có thể resolve hoặc xóa annotation theo quyền giao diện.
7. Nhấn Approve hoặc Request changes/Reject theo nút đang hiển thị.

Điều kiện bắt buộc:

- Chỉ Editor được phân công và đã Accept mới duyệt chapter của series.
- Chỉ chapter `Reviewing` mới chuyển sang `Approved` hoặc về `Draft`.

## 13. Luồng 9 — Editor chuyển series sang Editorial Board

Sau khi ít nhất một chapter đã `Approved`:

1. Mở Editor Portal trên FE hoặc mobile.
2. Tại series đang `Pending_Editor`, nhấn `Approve & Send to EB`/nút chuyển EB.
3. Kiểm tra series chuyển `Pending_Editor → Pending_EB`.
4. Kiểm tra EB members nhận notification.

Điều kiện bắt buộc:

- Editor phải là người được phân công và đã Accept.
- Series phải còn `Pending_Editor`.
- Series phải có ít nhất một chapter `Approved` hoặc `Published`.
- Nếu chưa có chapter được duyệt, backend từ chối chuyển EB.

Nhánh yêu cầu sửa series:

1. Dùng series phụ đang `Pending_Editor`.
2. Editor chọn Request changes.
3. Nhập revision notes bắt buộc.
4. Series quay về `Draft` và Mangaka nhận phản hồi.

Khi series đã `Pending_EB`:

- Studio bị khóa ở chế độ chỉ xem.
- Không được tạo task hoặc tiếp tục chỉnh sửa package đang chờ hội đồng.

## 14. Luồng 10 — EB tạo rubric và lịch họp proposal review

Thực hiện trên mobile `Publication Control`.

### 14.1 Rubric

1. Đăng nhập EB Head.
2. Mở tab `Rubrics`.
3. Nhấn `New`.
4. Nhập Rubric name.
5. Nhập mỗi tiêu chí trên một dòng.
6. Nhấn Create rubric.
7. Chọn Activate cho rubric muốn dùng.

Điều kiện bắt buộc:

- Form cần tên và ít nhất một tiêu chí.
- Rubric mới được tạo ở trạng thái chưa active.
- Khi kích hoạt một rubric, các rubric khác bị bỏ active.
- Tab Rubrics trên mobile chỉ hiển thị cho EB Head.

### 14.2 Tạo proposal review meeting

1. Mở tab `Meetings`.
2. Nhấn `New meeting`.
3. Chọn `Proposal review`.
4. Nhập Title.
5. Chạm trường Time và chọn ngày/giờ bằng date-time picker.
6. Nhập Location và Description nếu cần.
7. Chọn series đang `Pending_EB`.
8. Chọn các Editorial Board Member.
9. Chọn Rubric cho cuộc họp.
10. Nhấn Create meeting.

Điều kiện bắt buộc:

- Chỉ EB Head tạo hoặc hủy meeting.
- Title, date/time, ít nhất một series và ít nhất một thành viên chọn trong form là bắt buộc.
- Hệ thống tự thêm EB Head vào danh sách participant.
- Tổng số participant duy nhất, tính cả EB Head, phải là số lẻ. Vì form còn yêu cầu chọn thành viên ngoài EB Head, cấu hình nhỏ nhất hợp lệ để demo là EB Head + 2 thành viên = 3.
- Tất cả participant phải là Editorial Board Member đang active.
- Proposal review meeting chỉ chọn series `Pending_EB`.
- Meeting phục vụ bỏ phiếu phải được tạo sau khi series bắt đầu giai đoạn EB review; meeting cũ không được dùng để bỏ phiếu cho vòng mới.

Kết quả:

- Meeting xuất hiện trong `My meetings`.
- Participant và Mangaka nhận notification liên quan.

## 15. Luồng 11 — EB bỏ phiếu và chốt quyết định

### 15.1 Từng thành viên bỏ phiếu

1. Đăng nhập từng EB Member có tên trong meeting.
2. Mở `Publication Control → Votes`.
3. Chọn series.
4. Chấm từng tiêu chí rubric từ 1 đến 10.
5. Nhập Comments nếu cần.
6. Gửi phiếu.
7. Lặp lại cho tất cả participant của meeting.

Quy tắc tính phiếu:

- Mỗi tiêu chí bắt buộc có điểm từ 1 đến 10.
- Điểm trung bình từ 5 trở lên tạo phiếu `approved`.
- Điểm trung bình dưới 5 tạo phiếu `rejected`.
- Chỉ participant trong meeting mới được bỏ phiếu.
- Một thành viên có thể gửi lại để cập nhật phiếu của mình.

### 15.2 EB Head chốt nhánh phê duyệt

1. Đăng nhập EB Head.
2. Mở series đã đủ phiếu.
3. Chọn Final decision.
4. Chọn một trong hai chế độ xuất bản:
   - `Immediate`.
   - `Scheduled`, sau đó chọn Weekly/Monthly và ngày bắt đầu trong tương lai.
5. Xác nhận hoàn tất.

Điều kiện bắt buộc:

- Chỉ EB Head được finalize.
- Tất cả participant phải đã bỏ phiếu; thiếu một phiếu cũng không thể finalize.
- Backend tự lấy kết quả theo đa số participant, không lấy quyết định tùy ý từ nút phía client.
- Chỉ khi số phiếu approve lớn hơn reject thì kết quả là approved.
- Nhánh approved phải có ít nhất một chapter `Approved` hoặc `Published` làm launch chapter.
- Scheduled bắt buộc chọn Weekly/Monthly và thời điểm bắt đầu trong tương lai.

Kết quả với `Immediate`:

- Series chuyển `Pending_EB → Active`.
- Nếu chưa có chapter Published, chapter Approved có số nhỏ nhất tự chuyển sang `Published`.
- Series và launch chapter xuất hiện cho Reader.

Kết quả với `Scheduled`:

- Series chuyển sang `Active`.
- Chapter Approved đầu tiên được gắn lịch xuất bản theo thời điểm bắt đầu.
- Scheduler tiếp tục phát hành theo nhịp Weekly hoặc Monthly.

### 15.3 Lưu ý về nhánh EB từ chối trên mobile

- Backend yêu cầu feedback/comments khi đa số bỏ phiếu từ chối và series phải quay về `Draft`.
- Payload finalize proposal hiện tại của màn Board mobile không gửi trường comments.
- Vì vậy không dùng nhánh đa số từ chối làm nhánh demo chính trên mobile. Nếu cố finalize, backend có thể trả lỗi yêu cầu feedback.
- Nhánh mobile ổn định để demo là đa số approve. Đây là giới hạn hiện tại, không mô tả là hội đồng có thể chốt từ chối đầy đủ trên mobile.

## 16. Luồng 12 — Xuất bản các chapter tiếp theo

Sau khi series đã `Active`:

1. Mangaka tạo/sản xuất chapter tiếp theo trên FE.
2. Mangaka Submit chapter review.
3. Editor Approve chapter.
4. Nếu series dùng chế độ immediate, Editor có thể Publish chapter Approved.
5. Nếu cần rút chapter, Editor được phân công hoặc EB Head chọn Withdraw/Unpublish để chuyển `Published → Approved`.

Điều kiện bắt buộc:

- Chỉ Editor được phân công và đã Accept mới Publish thủ công.
- Series phải là `Active`.
- Chapter phải là `Approved`.
- Với series ở chế độ scheduled, Editor không Publish thủ công; scheduler xử lý theo lịch.

### Cập nhật lịch xuất bản từ Rankings

1. EB Head mở `Publication Control → Rankings`.
2. Chọn một series `Active`.
3. Nhấn `Publication schedule`.
4. Chọn Weekly hoặc Monthly.
5. Lưu.

Kết quả:

- Series chuyển sang chế độ scheduled.
- Mốc tiếp theo được đặt sau 7 ngày hoặc 1 tháng tính từ lúc cập nhật.

## 17. Luồng 13 — Reader khám phá và đọc manga

Thực hiện trên mobile để thể hiện trải nghiệm chính.

### 17.1 Reader Hub

1. Đăng nhập Reader.
2. Mở `Reader Hub`.
3. Kéo refresh để tải lại dữ liệu.
4. Xem Featured/Read now.
5. Nhập từ khóa tìm kiếm.
6. Chọn mood/genre chip để lọc danh sách.
7. Xem Continue reading nếu tài khoản đã có tiến độ.
8. Xem Hot this week và leaderboard đang hiển thị.
9. Nhấn Follow/Subscribe trên series nếu nút xuất hiện.

Điều kiện dữ liệu:

- Reader chỉ đọc được chapter có trạng thái `Published`.
- Series vừa `Active` nhưng chưa có chapter Published sẽ không có nội dung để mở đọc; luồng EB đã tự bảo đảm launch chapter cho nhánh duyệt thành công.

### 17.2 Reader Assistant trên mobile

1. Tại Reader Hub, mở Reader Assistant.
2. Nếu có Continue reading, nhấn tiếp tục đọc từ gợi ý.
3. Nếu chưa có tiến độ, mở một recommendation.
4. Mở mini chat.
5. Chọn prompt gợi ý hoặc nhập câu hỏi.
6. Chọn một series trong kết quả recommendation.

Kết quả:

- Assistant trả lời và có thể đưa danh sách series gợi ý.
- Nút series mở màn Series detail thực tế.

### 17.3 Series detail

1. Chọn một series từ Reader Hub.
2. Xem cover, author, status, genre và thông tin tổng quan.
3. Chuyển giữa tab Chapters và About.
4. Nhấn Follow/Unfollow.
5. Nhấn Read now hoặc chọn một chapter.

Điều kiện:

- Danh sách Chapters trên mobile đã lọc chỉ còn chapter `Published`.
- Nút Read now bị vô hiệu nếu không có chapter Published.

### 17.4 Reading View

1. Mở chapter.
2. Cuộn theo chế độ Vertical scroll.
3. Mở cài đặt đọc và chuyển sang Cinema nếu muốn.
4. Thay theme/độ sáng theo các điều khiển đang có.
5. Bật Auto scroll và chọn tốc độ trong chế độ scroll.
6. Chuyển chapter trước/sau nếu có.
7. Đọc gần hết chapter để hệ thống cập nhật reading progress.
8. Chấm rating series từ 1 đến 5 sao.
9. Mở comments và đăng một bình luận gốc.

Chức năng được lưu backend:

- Follow/Unfollow series.
- Reading progress.
- Rating series.
- Bình luận gốc.

Giới hạn hiện tại trên mobile:

- Nút hình trái tim/bookmark chỉ thay đổi state tại màn hiện tại, chưa lưu bookmark backend.
- Reply và like comment trên mobile hiện chỉ cập nhật state cục bộ; tải lại có thể mất thay đổi.
- Nếu cần demo reply/like comment được lưu thật, thực hiện trên FE Reading View.
- Chapter reaction được triển khai trên FE Reading View, không có trong mobile Reading View hiện tại.

### 17.5 Các tương tác Reader được lưu trên FE

Trên FE Reading View có thể trình diễn thêm:

1. Đăng comment.
2. Reply comment.
3. Like comment/reply.
4. Chọn chapter reaction.
5. Chấm rating series.
6. Chuyển Scroll/Paged view.

Lưu ý:

- Bookmark trên FE cũng đang là state giao diện, không nên mô tả là bookmark đã đồng bộ backend.
- Nút Share đang hiển thị nhưng không có luồng chia sẻ hoàn chỉnh trong kịch bản này.

## 18. Luồng 14 — Notifications

Thực hiện trên mobile với từng vai trò.

1. Tạo một sự kiện thật, ví dụ giao task, mời Editor, tạo meeting hoặc publish chapter.
2. Mở tab `Notifications` của tài khoản nhận.
3. Kiểm tra badge unread ở bottom tab.
4. Kiểm tra notification mới xuất hiện realtime.
5. Nhấn một notification chưa đọc.
6. Kiểm tra notification được đánh dấu đã đọc và điều hướng theo loại sự kiện.
7. Quay lại Notifications.
8. Nhấn `Mark all as read`.
9. Kiểm tra unread count và badge được cập nhật.

Các đích điều hướng đang có:

- Task hoặc assistant assignment → Tasks.
- Editor chapter review → Editor review/Editor Portal.
- EB assign/votes/meeting → Publication Control.
- Reader series → Series detail.
- Reader chapter → Reading View.

Lưu ý:

- Mangaka nhận notification dẫn tới Manage/Studio, nhưng các route này trên mobile là web-only. Không dùng notification đó để chứng minh mobile có Studio native.

## 19. Luồng 15 — Rankings, rủi ro và ngừng phát hành

Luồng này cần một series đã `Active`, có dữ liệu reader rating/reaction và tốt nhất đã có chapter Published trong một khoảng thời gian đủ để ranking có ý nghĩa.

### 19.1 Rankings

1. Đăng nhập EB Head hoặc EB Member.
2. Mở `Publication Control → Rankings`.
3. Xem thứ hạng, score và risk level của series.
4. Chọn series có dấu hiệu rủi ro để mở quy trình review ngừng phát hành.

Lưu ý:

- Hệ thống không còn hỗ trợ nhập tay reader vote.
- Ranking/risk sử dụng dữ liệu reader rating và chapter reactions do hệ thống tổng hợp.

### 19.2 Tạo cancellation review meeting

1. EB Head chọn `Start review` tại series `Active`, hoặc tạo meeting từ tab Meetings.
2. Chọn purpose `Cancellation`.
3. Chọn ngày/giờ bằng picker.
4. Chọn đúng series `Active`.
5. Chọn EB participants sao cho tổng số người, gồm EB Head, là số lẻ.
6. Nhấn Create meeting.

Điều kiện bắt buộc:

- Chỉ EB Head tạo meeting.
- Cancellation meeting chỉ nhận series `Active`.
- Không tạo thêm cancellation meeting đang open cho cùng series.
- Participant phải là EB member active.

### 19.3 Bỏ phiếu tiếp tục hoặc ngừng

1. Từng participant mở tab `Cancellation`.
2. Chọn series.
3. Chọn `Continue` hoặc `Cancel`.
4. Nhập Comments nếu cần.
5. Submit vote.
6. Lặp lại đến khi tất cả participant đã bỏ phiếu.

Điều kiện bắt buộc:

- Series phải còn `Active`.
- Phải có cancellation meeting đang open.
- Chỉ participant của meeting được vote.

### 19.4 EB Head finalize cancellation review

1. EB Head mở series ở tab Cancellation.
2. Nhấn Finalize.
3. Nếu dự kiến đa số chọn Cancel, nhập Reason.
4. Xác nhận chốt kết quả.

Quy tắc:

- Tất cả participant phải vote.
- Chỉ khi số phiếu Cancel lớn hơn Continue thì series chuyển `Active → Cancelled`.
- Nếu hòa, kết quả là Continue.
- Reason bắt buộc khi đa số chọn Cancel.
- Nếu Continue thắng, series giữ `Active` và cờ cancellation risk được xóa.

## 20. Luồng 16 — Dashboard và các màn hỗ trợ

### FE Dashboard

1. Mở Dashboard bằng tài khoản sản xuất.
2. Quan sát các thống kê và dữ liệu workflow đang được trả về cho vai trò đó.
3. Dùng Dashboard như màn tổng quan, không dùng để thay thế các thao tác tạo series/task/review vốn nằm ở màn chuyên biệt.

### Mobile Editorial Board Overview

1. Mở `Publication Control → Overview`.
2. Xem số liệu tổng quan, series cần theo dõi và chapter quá hạn nếu có dữ liệu.
3. Dùng các tab chức năng để thực hiện thao tác; Overview chủ yếu là màn quan sát.

## 21. Checklist ràng buộc phải nhắc trong lúc trình bày

- [ ] Chỉ Mangaka/Assistant/Reader tự đăng ký; Editor và EB dùng tài khoản cấp sẵn.
- [ ] Series cần ít nhất một chapter trước khi Submit.
- [ ] Chỉ EB Head phân Editor.
- [ ] Editor phải Accept trước khi sản xuất ở `Pending_Editor` được mở.
- [ ] Direct task được phép ở `Pending_Editor + accepted`; open freelance/dedicated cần series `Active`.
- [ ] Quản lý dedicated assistants chỉ dùng khi series `Active`.
- [ ] Page task và chapter task không được chồng phạm vi khi task cũ chưa `done`.
- [ ] Chapter cần ít nhất một page trước khi Submit review.
- [ ] Series cần ít nhất một chapter Approved/Published trước khi Editor chuyển sang EB.
- [ ] Series `Pending_EB` và chapter `Reviewing/Approved/Published` bị khóa sản xuất.
- [ ] Meeting chỉ do EB Head tạo; participant phải active và tổng số phải lẻ.
- [ ] Chỉ participant của meeting được vote.
- [ ] Tất cả participant phải vote trước khi EB Head finalize.
- [ ] Kết quả cuối dựa trên đa số phiếu, không phải lựa chọn tùy ý của EB Head.
- [ ] Scheduled publication cần Weekly/Monthly và ngày bắt đầu trong tương lai.
- [ ] Reader chỉ thấy chapter Published.
- [ ] Mobile Tasks không upload file thật; dùng FE nếu demo sản phẩm nộp.
- [ ] Mobile reply/like comment và bookmark chưa được lưu backend.
- [ ] Mobile Settings có một số dòng chỉ là placeholder.
- [ ] Không dùng nhánh proposal rejection làm nhánh chính trên mobile vì finalize chưa gửi comments bắt buộc.

## 22. Trình tự demo rút gọn 30 phút

1. Mangaka đăng nhập FE, tạo series và chapter.
2. Mangaka Submit series sang `Pending_Editor`.
3. EB Head dùng mobile Assign editor.
4. Editor dùng mobile Accept invitation.
5. Mangaka dùng FE upload page và giao task trực tiếp.
6. Assistant dùng mobile nhận task và chuyển trạng thái; nếu cần file thật thì chuyển sang FE để Submit.
7. Mangaka dùng FE review task và Submit chapter review.
8. Editor dùng mobile Approve chapter.
9. Editor chuyển series sang `Pending_EB`.
10. EB Head dùng mobile tạo proposal meeting với tổng participant lẻ.
11. Các participant chấm rubric và gửi phiếu approve.
12. EB Head finalize chế độ Immediate.
13. Reader refresh mobile, mở series, đọc chapter, rate và comment.
14. Mở Notifications để chứng minh cập nhật realtime và Mark all as read.

Kết quả cuối cần đạt:

- Series ở `Active`.
- Launch chapter ở `Published`.
- Reader nhìn thấy và đọc được chapter.
- Task, chapter, series, meeting, vote và notification đều đi qua đúng màn hình và đúng vai trò.
