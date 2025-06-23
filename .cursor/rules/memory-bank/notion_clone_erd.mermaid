classDiagram
direction BT
class AbstractAuditable {
    Date  createdDate
    Date  lastModifiedDate
}
class AbstractPersistable {
    PK  id
}
class BaseTimeEntity {
    LocalDateTime  createdAt
    LocalDateTime  updatedAt
}
class Document {
    Long  id
    String  content
    boolean  isTrashed
    Integer  sortOrder
    String  title
}
class Notification {
    Long  id
    String  message
    String  payload
    NotificationStatus  status
    NotificationType  type
}
class Permission {
    Long  id
    PermissionType  permissionType
    PermissionStatus  status
}
class User {
    Long  id
    String  email
    String  name
    String  password
    String  profileImageUrl
}
class Workspace {
    Long  id
    String  name
}

AbstractAuditable  --|>  AbstractPersistable 
Document  --|>  BaseTimeEntity 
Document "0..*" --> "0..1" User 
Document "0..*" <--> "0..1" Workspace 
Notification  --|>  BaseTimeEntity 
Notification "0..*" --> "0..1" User 
Permission  --|>  BaseTimeEntity 
Permission "0..*" --> "0..1" Document 
Permission "0..*" --> "0..1" User 
User  --|>  BaseTimeEntity 
Workspace  --|>  BaseTimeEntity 
Workspace "0..*" --> "0..1" User 
Workspace "0..1" <--> "0..*" Workspace 
