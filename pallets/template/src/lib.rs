#![cfg_attr(not(feature = "std"), no_std)]

pub use pallet::*;

#[cfg(test)]
mod mock;

#[cfg(test)]
mod tests;

pub mod weights;

#[cfg(feature = "runtime-benchmarks")]
mod benchmarking;


#[frame::pallet]
pub mod pallet {
	use frame::prelude::*;
	use scale_info::prelude::vec::Vec;

	/// Configure the pallet by specifying the parameters and types on which it depends.
	#[pallet::config]
	pub trait Config: frame_system::Config {
		type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;

		/// A type representing the weights required by the dispatchables of this pallet.
		type WeightInfo: crate::weights::WeightInfo;

		/// Maximum bytes allowed for a student's name
		#[pallet::constant]
    	type MaxNameLen: Get<u32>;

		/// Maximum bytes allowed for surname
		#[pallet::constant]
		type MaxSurnameLen: Get<u32>;
	}


	#[pallet::pallet]
	pub struct Pallet<T>(_);

	
	#[derive(
		Encode, Decode, MaxEncodedLen, TypeInfo, CloneNoBound, PartialEqNoBound, DefaultNoBound,
	)]
	#[scale_info(skip_type_params(T))]
	pub struct CompositeStruct<T: Config> {
		/// A block number.
		pub(crate) block_number: BlockNumberFor<T>,
	}


	#[derive(
    Encode, Decode, DecodeWithMemTracking, MaxEncodedLen, TypeInfo,
    Clone, PartialEq, Eq, Debug, Default,
	)]
	pub enum Gender {
		#[default]
		Male,
		Female,
		Other,
	}


	// Defining Student structure
	#[derive(
		Encode, Decode, MaxEncodedLen, TypeInfo,
		CloneNoBound, PartialEqNoBound, DebugNoBound, Default,
	)]
	#[scale_info(skip_type_params(T))]
	pub struct Student<T: Config> {
		pub name: BoundedVec<u8, T::MaxNameLen>,
		pub surname: BoundedVec<u8, T::MaxSurnameLen>,
		pub age: u32,
		pub gender: Gender,
		pub has_graduated: bool,
	}


	/// Stores a Student for each account
	#[pallet::storage]
	pub type StudentCount<T> = StorageValue<_, u32, ValueQuery>;

	#[pallet::storage]
	pub type Students<T: Config> =
		StorageMap<_, Blake2_128Concat, u32, Student<T>, OptionQuery>;

	#[pallet::storage]
	pub type StudentsByOwner<T: Config> = StorageMap<
		_,
		Blake2_128Concat,
		T::AccountId,
		BoundedVec<u32, ConstU32<100>>, // max 100 students per account
		ValueQuery,
	>;


	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		SomethingStored { block_number: BlockNumberFor<T>, who: T::AccountId },

		StudentCreated { who: T::AccountId },
		StudentDeleted { who: T::AccountId, student_id: u32 },
	}


	#[pallet::error]
	pub enum Error<T> {
		NoneValue,
		StorageOverflow,
		NameTooLong,
		SurnameTooLong,
		StudentAlreadyExists,
		MaxStudentsReached,
		StudentNotFound,
		NotStudentOwner,
		AlreadyGraduated,
	}

	
	#[pallet::hooks]
	impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {}

	
	#[pallet::call]
	impl<T: Config> Pallet<T> {

		// CREATE STUDENT
		#[pallet::call_index(0)]
		#[pallet::weight(10_000)]
		pub fn create_student(
			origin: OriginFor<T>,
			name: Vec<u8>,
			surname: Vec<u8>,
			age: u32,
			gender: Gender,
		) -> DispatchResult {
			let who = ensure_signed(origin)?;

			// Convert name → bounded
			let name: BoundedVec<_, T::MaxNameLen> =
				name.try_into().map_err(|_| Error::<T>::NameTooLong)?;

			let surname: BoundedVec<_, T::MaxSurnameLen> =
				surname.try_into().map_err(|_| Error::<T>::SurnameTooLong)?;

			// Generate new student ID
			let student_id = StudentCount::<T>::get();
			StudentCount::<T>::put(student_id + 1);

			// Build student struct
			let student = Student::<T> {
				name,
				surname,
				age,
				gender,
				has_graduated: false,
			};

			// Insert into Students map
			Students::<T>::insert(student_id, student);

			// Add student's ID into student's owner list
			StudentsByOwner::<T>::try_mutate(&who, |list| {
				list.try_push(student_id)
					.map_err(|_| Error::<T>::MaxStudentsReached)
			})?;

			Ok(())
		}


		// GRADUATE STUDENT
		#[pallet::call_index(1)]
		#[pallet::weight(10_000)]
		pub fn graduate_student(
			origin: OriginFor<T>,
			student_id: u32,
		) -> DispatchResult {
			let who = ensure_signed(origin)?;

			// Ensure the student exists
			Students::<T>::try_mutate(student_id, |maybe_student| {
				let student = maybe_student.as_mut().ok_or(Error::<T>::StudentNotFound)?;

				// Ensure the caller owns this student
				let owned_ids = StudentsByOwner::<T>::get(&who);
				if !owned_ids.contains(&student_id) {
					return Err(Error::<T>::NotStudentOwner);
				}

				// Ensure student is not already graduated
				if student.has_graduated {
					return Err(Error::<T>::AlreadyGraduated);
				}

				// Mutate state: graduate the student
				student.has_graduated = true;

				Ok(())
			})?;

			Ok(())
		}


		// DELETE STUDENT
		#[pallet::call_index(2)]
		#[pallet::weight(10_000)]
		pub fn delete_student(
			origin: OriginFor<T>,
			student_id: u32,
		) -> DispatchResult {
			let who = ensure_signed(origin)?;

			// Ensure the student exists
			let exists = Students::<T>::contains_key(student_id);
			ensure!(exists, Error::<T>::StudentNotFound);

			// Ensure the caller owns this student
			StudentsByOwner::<T>::try_mutate(&who, |owned_ids| {
				if let Some(index) = owned_ids.iter().position(|id| *id == student_id) {
					owned_ids.swap_remove(index); // efficient removal
					Ok(())
				} else {
					Err(Error::<T>::NotStudentOwner)
				}
			})?;

			// Remove the student record
			Students::<T>::remove(student_id);

			// Emit event
			Self::deposit_event(Event::StudentDeleted { who, student_id });

			Ok(())
		}
	}
}