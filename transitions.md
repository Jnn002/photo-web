### 1.3 Transition Validation Rules

#### Request → Negotiation

-   Session must have valid client
-   Session date must be in the future
-   Session type must be set
-   User has permission: `session.edit.pre-assigned`

#### Negotiation → Pre-scheduled

-   Session must have at least one item in `session_detail`
-   `total` must be greater than 0
-   User has permission: `session.edit.pre-assigned`

**Actions on transition:**

-   Calculate `payment_deadline` = current timestamp + PAYMENT_DEADLINE_DAYS
-   Calculate `deposit_amount` = `total` × (`deposit_percentage` / 100)

#### Pre-scheduled → Confirmed

-   Deposit payment must be verified (record in `session_payment`)
-   Payment amount ≥ `deposit_amount`
-   Current timestamp ≤ `payment_deadline`
-   User has permission: `session.edit.pre-assigned`

**Actions on transition:**

-   Create `session_payment` record (type='Deposit')
-   Clear `payment_deadline`
-   Calculate `changes_deadline` = `session_date` - CHANGES_DEADLINE_DAYS (23:59:59)
-   Send confirmation email to client
-   Create entry in `session_status_history`

#### Confirmed → Assigned

-   Current timestamp > `changes_deadline`
-   At least one photographer assigned in `session_photographer`
-   If `session_type` = 'Studio': `room_id` must be set
-   User has permission: `session.assign-resources`

**Actions on transition:**

-   Calculate `estimated_delivery_date` = `session_date` + `estimated_editing_days`
-   Notify photographers via dashboard

#### Assigned → Attended

-   Current date ≥ `session_date`
-   User is assigned photographer OR has `session.edit.all` permission
-   User has permission: `session.mark-attended`

**Actions on transition:**

-   Session becomes visible to editors
-   Photographer can add observations/incidents

#### Attended → In Editing

-   `assigned_editor_id` must be NULL (no editor assigned yet)
-   User has role 'Editor'
-   User has permission: `session.view.own`

**Actions on transition:**

-   Set `assigned_editor_id` = current user
-   Editor can adjust `estimated_delivery_date` if needed

#### In Editing → Ready for Delivery

-   User must be the assigned editor
-   User has permission: `session.mark-ready`

**Actions on transition:**

-   Send "material ready" email to client
-   Notify coordinators via dashboard

#### Ready for Delivery → Completed

-   Optional: verify total payments ≥ `total`
-   User has permission: `session.edit.all`

**Actions on transition:**

-   Session becomes read-only (except for admins)

#### Any State → Canceled

-   State must NOT be 'Completed' or already 'Canceled'
-   `cancellation_reason` must be provided
-   User has permission: `session.cancel`

**Actions on transition:**

-   Set `canceled_at` = current timestamp
-   Calculate refund (see section 4)
-   Create `session_payment` record if refund applies (type='Refund')
-   Free assigned resources (photographers, rooms)
-   Send cancellation email to client
