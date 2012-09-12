describe('Uniform Interface', function(){
	describe('uses limited http verbs', function() {
		it('should use GET|PUT|POST|HEAD|DELETE|PATCH')
	})
	describe('follows idempotence rules', function() {
		it('should use idempotent GET to retrieve resources')
		it('should use non-idempotent POST to create resources')
		it('should use idempotent PUT to replace resources')
		it('should use idempotent PATCH to partially update resources')
		it('should use idempotent DELETE to delete resources')
	})
	describe('support POST tunneling using Accept Headers', function() {
		it('should support PUT as a POST with X-HTTP-Method-Override header')
		it('should support PATCH as a POST with X-HTTP-Method-Override header')
		it('should support DELETE as a POST with X-HTTP-Method-Override header')
	})
	describe('support POST tunneling using query parameter', function() {
		it('should support PUT as a POST with _method query parameter')
		it('should support PATCH as a POST with _method query parameter')
		it('should support DELETE as a POST with _method query parameter')
	})
	describe('may support batch processing', function() {
		it('may support batch processing')
	})
})
