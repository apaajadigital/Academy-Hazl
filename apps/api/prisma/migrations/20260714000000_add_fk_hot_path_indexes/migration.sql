-- CreateIndex
CREATE INDEX "courses_trainerId_idx" ON "courses"("trainerId");

-- CreateIndex
CREATE INDEX "courses_categoryId_idx" ON "courses"("categoryId");

-- CreateIndex
CREATE INDEX "courses_status_idx" ON "courses"("status");

-- CreateIndex
CREATE INDEX "course_enrollments_courseId_idx" ON "course_enrollments"("courseId");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "lms_batches_tenantId_idx" ON "lms_batches"("tenantId");

-- CreateIndex
CREATE INDEX "lms_courses_tenantId_idx" ON "lms_courses"("tenantId");

-- CreateIndex
CREATE INDEX "lms_lessons_courseId_idx" ON "lms_lessons"("courseId");

-- CreateIndex
CREATE INDEX "reviews_itemType_itemId_idx" ON "reviews"("itemType", "itemId");

