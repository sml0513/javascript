// 경고 버튼 이벤트
const myButton = document.querySelector("#alert-button");
myButton.addEventListener("click", () => {
    alert("니얼굴 도스딱");
});

const meButton = document.querySelector("#second-button");
meButton.addEventListener("click", () => {
    alert("니얼굴 전재유");
});

// 배경색 변경 버튼 이벤트
const colorButton = document.querySelector("#color-button");
colorButton.addEventListener("click", () => {
    document.body.style.backgroundColor = "#FF5733";
});

// 글씨 변경 버튼 이벤트
const textButton = document.querySelector("#change-text");
const title = document.querySelector("#text");
textButton.addEventListener("click", () => {
    title.textContent = "새로운 이름!!";
    title.style.backgroundColor = "#333333";
    title.style.color = "#FFFFFF";
});

// 댓글 입력 관련 변수
const commentInput = document.querySelector("#comment-input");
const commentButton = document.querySelector("#comment-button");
const commentList = document.querySelector("#comment-list");

// 댓글 추가 함수
const addComment = () => {
    const commentText = commentInput.value.trim();
    if (commentText !== "") {
        const li = document.createElement("li");
        li.textContent = commentText;
        commentList.appendChild(li);
        commentInput.value = "";
    }
};

// 댓글 입력 버튼 클릭 이벤트
commentButton.addEventListener("click", addComment);
    
// 댓글 입력 필드에서 엔터 키 이벤트
commentInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        addComment();
    }
});

// 제목 변경 관련 변수
// 제목 변경 관련 변수
const titleInput = document.querySelector("#title-input");
const titleInputBtn = document.querySelector("#title-input-btn");

// 제목 변경 버튼 클릭 이벤트
titleInputBtn.addEventListener("click", () => {
    const newTitle = titleInput.value.trim();
    if (newTitle !== "") {
        title.textContent = newTitle;
        titleInput.value = ""; // 입력 필드 초기화
    }
});

// 제목 변경 입력 필드에서 엔터 키 이벤트
titleInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        const newTitle = titleInput.value.trim();
        if (newTitle !== "") {
            title.textContent = newTitle;
            titleInput.value = ""; // 입력 필드 초기화
        }
    }
});
